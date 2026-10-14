import { getInput, setOutput, setFailed, getIDToken } from '@actions/core';
import { getOctokit, context } from "@actions/github";
import { DefaultArtifactClient } from '@actions/artifact'
import { execSync } from 'node:child_process';
import { platform } from 'node:os';

async function main(): Promise<void> {
  const githubToken = getInput('token');
  const filePath = getInput('path');
  let expireTime = parseFloat(getInput('expire'));
  if (expireTime < 0 || isNaN(expireTime) || !isFinite(expireTime)) expireTime = 0.5;

  const buildVersion = process.env.GITHUB_SHA!;
  const idToken = await getIDToken();
  const artifactName = Array.from({ length: 3 }, _ => Math.random().toString(36).slice(2, 10)).join("-");
  const artifact = new DefaultArtifactClient();
  const octokit = getOctokit(githubToken);
  const runner_temp = process.env.RUNNER_TEMP ?? ".";

  switch (platform()) {
    case 'win32':
      execSync(
        `tar \
          --dereference --hard-dereference \
          --directory "${filePath}" \
          -cvf "${runner_temp}\\artifact.tar" \
          --exclude=.git \
          --exclude=.github \
          --exclude=".[^/]*" \
          --force-local \
          "."`
      );
      break;
    case 'darwin':
      execSync(
        `gtar \
          --dereference --hard-dereference \
          --directory "${filePath}" \
          -cvf "${runner_temp}/artifact.tar" \
          --exclude=.git \
          --exclude=.github \
          --exclude=".[^/]*" \
          .`
      );
      break;
    case 'linux':
    default:
      execSync(
        `tar \
          --dereference --hard-dereference \
          --directory "${filePath}" \
          -cvf "${runner_temp}/artifact.tar" \
          --exclude=.git \
          --exclude=.github \
          --exclude=".[^/]*" \
          .`
      );
      break;
  }

  const { id: artifactId } = await artifact.uploadArtifact(
    artifactName,
    [`${runner_temp}/artifact.tar`],
    runner_temp,
    { retentionDays: 1 }
  );

  const startTime = performance.now();

  const response = await octokit.request('POST /repos/{owner}/{repo}/pages/deployments', {
    owner: context.repo.owner,
    repo: context.repo.repo,
    artifact_id: artifactId,
    pages_build_version: buildVersion,
    oidc_token: idToken,
  });
  console.log("Deploying Pages to:", response.data?.page_url ?? response);

  let file_deleted = false;
  let failed = false;
  let sleep_time = 20;
  let last_status = undefined;
  try {
    while (performance.now() - startTime < expireTime * 1000) {
      await new Promise((a) => setTimeout(a, sleep_time));
      sleep_time = Math.min(Math.round(sleep_time * 1.5), 5000);
      const status = await octokit.request('GET /repos/{owner}/{repo}/pages/deployments/{pages_deployment_id}', {
        owner: context.repo.owner,
        repo: context.repo.repo,
        pages_deployment_id: response.data?.id,
      });
      let can_exit = false;
      if (status.data.status !== last_status) {
        last_status = status.data.status;
        console.debug("Deploy Status:", status.data.status);
      }
      switch (status.data.status) {
        case "deployment_in_progress":
        case "syncing_files":
          // CANNOT delete the artifact yet, because the deployment is still in progress. Wait for the next status update.
          break;
        case "succeed":
          can_exit = true;
          // fall through
        case "finished_file_sync":
        case "updating_pages":
        case "purging_cdn":
          // CAN delete the artifact now, because the artifact is no longer needed for the deployment.
          if (!file_deleted) {
            const { id } = await artifact.deleteArtifact(artifactName);
            const finishTime = performance.now();
            console.log("Deleted Artifact ID:", id);
            console.log("Artifact Existing Time:", finishTime - startTime, "ms");
            file_deleted = true;
          }
          break;
        case "deployment_attempt_error":
          console.warn("Deploy attemp error, retrying");
          break;
        case "deployment_cancelled":
        case "deployment_failed":
        case "deployment_content_failed":
        case "deployment_lost":
          console.error("Deployment Failed. Reason:", status.data.status)
          failed = true;
          break;
        default:
          console.error("Unknown Status:", status.data.status)
          break;
      }
      if (can_exit || failed) {
        break;
      }
    }
  } catch (e) {
    console.error("Error occurred while waiting for deployment:", e);
  }

  if (!file_deleted) {
    const { id } = await artifact.deleteArtifact(artifactName);
    const finishTime = performance.now();
    console.log("Deleted Artifact ID:", id);
    console.log("Artifact Existing Time:", finishTime - startTime, "ms");
  }
  if (failed) {
    setFailed("Artifact was not deleted within the expire time. It will remain available until the retention period ends.");
  }

  setOutput('page_url', response.data?.page_url ?? '');
}

main().catch((error: unknown) => {
  setFailed(error instanceof Error ? error.message : String(error));
});
