import { getInput, setOutput, getIDToken } from '@actions/core';
import { getOctokit, context } from "@actions/github";
import { DefaultArtifactClient } from '@actions/artifact'
import { execSync } from 'node:child_process';
import { platform } from 'node:os';

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
  case 'win32': // windows
    execSync(
      `tar \
        --dereference --hard-dereference \
        --directory "${filePath}" \
        -cvf "$RUNNER_TEMP\artifact.tar" \
        --exclude=.git \
        --exclude=.github \
        --exclude=".[^/]*" \
        --force-local \
        "."`
    );
    break;
  case 'darwin': // macos
    execSync(
      `gtar \
        --dereference --hard-dereference \
        --directory "${filePath}" \
        -cvf "$RUNNER_TEMP/artifact.tar" \
        --exclude=.git \
        --exclude=.github \
        --exclude=".[^/]*" \
        .`
    );
    break;
  case 'linux': // linux
  default:
    execSync(
      `tar \
        --dereference --hard-dereference \
        --directory "${filePath}" \
        -cvf "$RUNNER_TEMP/artifact.tar" \
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
// console.log(`Created artifact with id: ${artifactId} (bytes: ${size})`);
const startTime = performance.now();

const response = await octokit.request('POST /repos/{owner}/{repo}/pages/deployments', {
  owner: context.repo.owner,
  repo: context.repo.repo,
  artifact_id: artifactId,
  pages_build_version: buildVersion,
  oidc_token: idToken,
});
console.log("Page deployed to:", response.data?.page_url ?? response);

let file_deleted = false;
let sleep_time = 100;
while (performance.now() - startTime < expireTime * 1000) {
  await new Promise((a) => setTimeout(a, sleep_time)); // sleep 100 ms
  sleep_time *= Math.min(Math.round(sleep_time * 1.5), 5000); // increase sleep time by 1.5x, but not more than 5 seconds
  const status = await octokit.request('GET /repos/{owner}/{repo}/pages/deployments/{pages_deployment_id}', {
    owner: context.repo.owner,
    repo: context.repo.repo,
    pages_deployment_id: response.data?.id,
  });
  let can_exit = false;
  switch (status.data.status) {
    case "deployment_in_progress":
    case "syncing_files":
    case "finished_file_sync":
      // should wait for the deployment to finish
      break;
    case "succeed":
      can_exit = true;
    case "updating_pages":
    case "purging_cdn":
      // we can delete the files
      if (!file_deleted) {
        const { id } = await artifact.deleteArtifact(artifactName);
        const finishTime = performance.now();
        console.log("Deleted Artifact ID:", id);
        console.log("Artifact Existing Time:", finishTime - startTime, "ms");
        file_deleted = true;
      }
      break;
    case "deployment_attempt_error":
    case undefined:
      // may retry?
      break;
    case "deployment_cancelled":
    case "deployment_failed":
    case "deployment_content_failed":
    case "deployment_lost":
      // deploy failed
      console.error("Deployment Failed. Reason:", status.data.status)
      can_exit = true;
      break;
    default:
      // unknown state
      console.error("Unknown Status:", status.data.status)
      break;

  }
  if (can_exit) {
    break;
  }
}

if (!file_deleted) {
  // 报错, 中断执行
}

setOutput('page_url', response.data?.page_url)
