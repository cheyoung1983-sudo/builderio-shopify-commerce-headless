const fs = require('node:fs')

const API_ROOT = 'https://api.github.com'
const PER_PAGE = 100

function findOverlaps(currentPullRequest, otherPullRequests) {
  const currentFiles = new Set(currentPullRequest.files || [])

  return otherPullRequests
    .filter((pullRequest) => {
      return (
        pullRequest.number !== currentPullRequest.number &&
        pullRequest.state === 'open' &&
        pullRequest.base?.ref === 'main'
      )
    })
    .map((pullRequest) => ({
      number: pullRequest.number,
      title: pullRequest.title || '',
      head: pullRequest.head?.ref,
      files: [...new Set(pullRequest.files || [])]
        .filter((file) => currentFiles.has(file))
        .sort(),
    }))
    .filter((overlap) => overlap.files.length > 0)
    .sort((left, right) => left.number - right.number)
}

function workflowEscape(value) {
  return String(value)
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
    .replace(/:/g, '%3A')
    .replace(/,/g, '%2C')
}

function markdownEscape(value) {
  return String(value).replace(/[\\`|]/g, '\\$&').replace(/[\r\n]+/g, ' ')
}

async function fetchPages(url, token) {
  const results = []
  let page = 1

  while (true) {
    const separator = url.includes('?') ? '&' : '?'
    const response = await fetch(`${url}${separator}per_page=${PER_PAGE}&page=${page}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status} for ${url}`)
    }

    const pageResults = await response.json()
    if (!Array.isArray(pageResults)) throw new Error('GitHub API returned an unexpected response')
    results.push(...pageResults)
    if (pageResults.length < PER_PAGE) return results
    page += 1
  }
}

async function getChangedFiles(repository, pullRequestNumber, token) {
  const url = `${API_ROOT}/repos/${repository}/pulls/${pullRequestNumber}/files`
  const files = await fetchPages(url, token)
  return files.map((file) => file.filename)
}

function writeSummary(message) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY
  if (summaryPath) fs.appendFileSync(summaryPath, `${message}\n`)
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY || ''
  const token = process.env.GITHUB_TOKEN || ''
  const eventPath = process.env.GITHUB_EVENT_PATH

  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('GITHUB_REPOSITORY is missing or invalid')
  if (!token) throw new Error('GITHUB_TOKEN is missing')
  if (!eventPath) throw new Error('GITHUB_EVENT_PATH is missing')

  const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'))
  const current = event.pull_request
  if (!current || current.base?.ref !== 'main') return

  const pullRequestUrl = `${API_ROOT}/repos/${repository}/pulls`
  const openPullRequests = await fetchPages(`${pullRequestUrl}?state=open&base=main`, token)
  const withFiles = await Promise.all(
    openPullRequests.map(async (pullRequest) => ({
      ...pullRequest,
      files: await getChangedFiles(repository, pullRequest.number, token),
    }))
  )
  let currentWithFiles = withFiles.find((pullRequest) => pullRequest.number === current.number)
  if (!currentWithFiles) {
    currentWithFiles = {
      ...current,
      state: 'open',
      files: await getChangedFiles(repository, current.number, token),
    }
  }

  const overlaps = findOverlaps(currentWithFiles, withFiles)
  if (overlaps.length === 0) {
    writeSummary(`## PR overlap check\nNo overlapping files found with other open PRs targeting \`main\`.`)
    console.log('PR overlap check: no overlaps found.')
    return
  }

  const report = ['## PR overlap check', 'Shared files with other open PRs targeting `main`:']
  for (const overlap of overlaps) {
    const listedFiles = overlap.files.slice(0, 12)
    const extraCount = overlap.files.length - listedFiles.length
    const suffix = extraCount > 0 ? `, and ${extraCount} more` : ''
    const filesText = `${listedFiles.join(', ')}${suffix}`
    const warning = `PR #${overlap.number} (${overlap.title || overlap.head || 'untitled'}) shares ${overlap.files.length} file(s): ${filesText}`
    console.log(`::warning title=PR file overlap::${workflowEscape(warning)}`)
    report.push(`- **PR #${overlap.number} — ${markdownEscape(overlap.title || overlap.head || 'untitled')}**: ${overlap.files.length} shared file(s): ${listedFiles.map((file) => `\`${markdownEscape(file)}\``).join(', ')}${extraCount > 0 ? `, and ${extraCount} more` : ''}. Coordinate the changes or keep dependent work in a single PR.`)
  }
  writeSummary(report.join('\n'))
}

if (require.main === module) {
  main().catch((error) => {
    const warning = `PR overlap report could not complete: ${error.message}`
    console.log(`::warning title=PR overlap report unavailable::${workflowEscape(warning)}`)
    writeSummary(`## PR overlap check\n${warning}`)
    console.error(warning)
  })
}

module.exports = { findOverlaps }
