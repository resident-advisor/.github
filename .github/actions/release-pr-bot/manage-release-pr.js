module.exports = async ({
  github,
  context,
  mainBranch = 'main',
  developBranch = 'develop',
}) => {
  const { owner, repo } = context.repo

  const unreleasedPRs = await fetchUnreleasedPRs({
    github,
    owner,
    repo,
    mainBranch,
    developBranch,
  })

  if (unreleasedPRs.length === 0) {
    console.log('No unreleased PRs found. Skipping.')
    return
  }

  const body = buildBody(unreleasedPRs, mainBranch, developBranch)
  const reviewers = buildReviewers(unreleasedPRs)

  const existing = await findExistingReleasePR({
    github,
    owner,
    repo,
    mainBranch,
    developBranch,
  })

  if (existing) {
    await updateReleasePR({
      github,
      owner,
      repo,
      pr: existing,
      body,
      reviewers,
    })
  } else {
    await createReleasePR({
      github,
      owner,
      repo,
      body,
      reviewers,
      mainBranch,
      developBranch,
    })
  }
}

async function findExistingReleasePR({
  github,
  owner,
  repo,
  mainBranch,
  developBranch,
}) {
  const { data: openPRs } = await github.rest.pulls.list({
    owner,
    repo,
    state: 'open',
    base: mainBranch,
    head: `${owner}:${developBranch}`,
  })
  return openPRs[0]
}

async function fetchUnreleasedPRs({
  github,
  owner,
  repo,
  mainBranch,
  developBranch,
}) {
  const { data: compareData } =
    await github.rest.repos.compareCommitsWithBasehead({
      owner,
      repo,
      basehead: `${mainBranch}...${developBranch}`,
    })

  const aheadSHAs = new Set(compareData.commits.map((c) => c.sha))

  // Fetches all closed PRs on developBranch. On large/old repos this may be slow or
  // hit rate limits — revisit with paginate.iterator + early-exit if it becomes a problem.
  const mergedPRs = await github.paginate(github.rest.pulls.list, {
    owner,
    repo,
    state: 'closed',
    base: developBranch,
    per_page: 100,
  })

  return mergedPRs.filter(
    (pr) =>
      pr.merged_at && pr.merge_commit_sha && aheadSHAs.has(pr.merge_commit_sha),
  )
}

function buildReviewers(prs) {
  const logins = prs
    .map((pr) => pr.user?.login)
    .filter((login) => login && !login.includes('[bot]'))
  return [...new Set(logins)]
}

function buildBody(prs, mainBranch, developBranch) {
  const prLines = prs.map(
    (pr) => `- #${pr.number} — ${pr.title} (@${pr.user?.login})`,
  )
  return [
    '## 🚀 Release PR',
    '',
    `This PR was auto-generated. It includes the following changes from \`${developBranch}\` not yet in \`${mainBranch}\`:`,
    '',
    ...prLines,
    '',
    '---',
    `_Last updated: ${new Date().toUTCString()}_`,
  ].join('\n')
}

async function updateReleasePR({ github, owner, repo, pr, body, reviewers }) {
  console.log(`Updating existing Release PR #${pr.number}`)

  await github.rest.pulls.update({ owner, repo, pull_number: pr.number, body })

  const [{ data: currentReviews }, { data: submittedReviews }] =
    await Promise.all([
      github.rest.pulls.listRequestedReviewers({
        owner,
        repo,
        pull_number: pr.number,
      }),
      github.rest.pulls.listReviews({
        owner,
        repo,
        pull_number: pr.number,
      }),
    ])

  const excludedLogins = new Set(currentReviews.users.map((u) => u.login))
  const staleApprovers = new Set()

  const latestReviewByLogin = submittedReviews.reduce((map, review) => {
    const login = review.user?.login
    if (login) map.set(login, review)
    return map
  }, new Map())

  Array.from(latestReviewByLogin.entries()).forEach(([login, review]) => {
    if (review.state !== 'APPROVED') return
    if (review.commit_id === pr.head.sha) {
      excludedLogins.add(login)
    } else {
      staleApprovers.add(login)
    }
  })

  const newReviewers = reviewers.filter((r) => !excludedLogins.has(r))

  if (newReviewers.length > 0) {
    await github.rest.pulls.requestReviewers({
      owner,
      repo,
      pull_number: pr.number,
      reviewers: newReviewers,
    })
    const reRequested = newReviewers.filter((r) => staleApprovers.has(r))
    if (reRequested.length > 0) {
      console.log(
        `Re-requested review from ${reRequested.join(', ')} (new commits since their approval)`,
      )
    }
    console.log(`Added reviewers: ${newReviewers.join(', ')}`)
  }

  console.log(`Release PR #${pr.number} updated.`)
}

async function createReleasePR({
  github,
  owner,
  repo,
  body,
  reviewers,
  mainBranch,
  developBranch,
}) {
  console.log('No existing Release PR found. Creating one...')

  const { data: newPR } = await github.rest.pulls.create({
    owner,
    repo,
    title: `Release`,
    head: developBranch,
    base: mainBranch,
    body,
  })

  if (reviewers.length > 0) {
    await github.rest.pulls.requestReviewers({
      owner,
      repo,
      pull_number: newPR.number,
      reviewers,
    })
  }

  console.log(`Release PR #${newPR.number} created: ${newPR.html_url}`)
}
