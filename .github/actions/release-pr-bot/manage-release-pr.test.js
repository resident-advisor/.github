const run = require('./manage-release-pr')

const makeContext = () => ({ repo: { owner: 'test-owner', repo: 'test-repo' } })

const makeGithub = ({
  commits = [],
  mergedPRs = [],
  openPRs = [],
  currentReviewers = [],
  submittedReviews = [],
} = {}) => ({
  rest: {
    repos: {
      compareCommitsWithBasehead: jest.fn().mockResolvedValue({ data: { commits } }),
    },
    pulls: {
      list: jest.fn().mockResolvedValue({ data: openPRs }),
      create: jest.fn().mockResolvedValue({ data: { number: 99, html_url: 'https://github.com/test/pull/99' } }),
      update: jest.fn().mockResolvedValue({}),
      listRequestedReviewers: jest.fn().mockResolvedValue({ data: { users: currentReviewers } }),
      listReviews: jest.fn().mockResolvedValue({ data: submittedReviews }),
      requestReviewers: jest.fn().mockResolvedValue({}),
    },
  },
  paginate: jest.fn().mockResolvedValue(mergedPRs),
})

const unreleasedPR = {
  number: 1,
  title: 'Fix bug',
  merged_at: '2024-01-01T00:00:00Z',
  merge_commit_sha: 'abc123',
  user: { login: 'alice' },
}

describe('manage-release-pr', () => {
  it('skips when no unreleased PRs', async () => {
    const github = makeGithub({
      commits: [{ sha: 'abc123' }],
      mergedPRs: [{ ...unreleasedPR, merge_commit_sha: 'other-sha' }],
    })

    await run({ github, context: makeContext() })

    expect(github.rest.pulls.create).not.toHaveBeenCalled()
    expect(github.rest.pulls.update).not.toHaveBeenCalled()
  })

  it('creates a new release PR when none exists', async () => {
    const github = makeGithub({
      commits: [{ sha: 'abc123' }],
      mergedPRs: [unreleasedPR],
      openPRs: [],
    })

    await run({ github, context: makeContext() })

    expect(github.rest.pulls.create).toHaveBeenCalledWith(
      expect.objectContaining({ head: 'develop', base: 'main' }),
    )
    expect(github.rest.pulls.requestReviewers).toHaveBeenCalledWith(
      expect.objectContaining({ reviewers: ['alice'] }),
    )
  })

  it('updates the existing release PR', async () => {
    const github = makeGithub({
      commits: [{ sha: 'abc123' }],
      mergedPRs: [unreleasedPR],
      openPRs: [{ number: 42 }],
      currentReviewers: [],
    })

    await run({ github, context: makeContext() })

    expect(github.rest.pulls.update).toHaveBeenCalledWith(
      expect.objectContaining({ pull_number: 42 }),
    )
    expect(github.rest.pulls.requestReviewers).toHaveBeenCalledWith(
      expect.objectContaining({ reviewers: ['alice'] }),
    )
  })

  it('does not re-request reviews from existing reviewers', async () => {
    const github = makeGithub({
      commits: [{ sha: 'abc123' }],
      mergedPRs: [unreleasedPR],
      openPRs: [{ number: 42 }],
      currentReviewers: [{ login: 'alice' }],
    })

    await run({ github, context: makeContext() })

    expect(github.rest.pulls.requestReviewers).not.toHaveBeenCalled()
  })

  it('does not re-request reviews from people who already approved the current commit', async () => {
    const github = makeGithub({
      commits: [{ sha: 'abc123' }],
      mergedPRs: [unreleasedPR],
      openPRs: [{ number: 42, head: { sha: 'head-sha-1' } }],
      currentReviewers: [],
      submittedReviews: [
        { user: { login: 'alice' }, state: 'APPROVED', commit_id: 'head-sha-1' },
      ],
    })

    await run({ github, context: makeContext() })

    expect(github.rest.pulls.requestReviewers).not.toHaveBeenCalled()
  })

  it('re-requests review from someone who approved a stale commit', async () => {
    const github = makeGithub({
      commits: [{ sha: 'abc123' }],
      mergedPRs: [unreleasedPR],
      openPRs: [{ number: 42, head: { sha: 'head-sha-2' } }],
      currentReviewers: [],
      submittedReviews: [
        { user: { login: 'alice' }, state: 'APPROVED', commit_id: 'head-sha-1' },
      ],
    })

    await run({ github, context: makeContext() })

    expect(github.rest.pulls.requestReviewers).toHaveBeenCalledWith(
      expect.objectContaining({ pull_number: 42, reviewers: ['alice'] }),
    )
  })

  it('uses the latest review per person when they reviewed more than once', async () => {
    const github = makeGithub({
      commits: [{ sha: 'abc123' }],
      mergedPRs: [unreleasedPR],
      openPRs: [{ number: 42, head: { sha: 'head-sha-1' } }],
      currentReviewers: [],
      submittedReviews: [
        { user: { login: 'alice' }, state: 'APPROVED', commit_id: 'stale-sha' },
        { user: { login: 'alice' }, state: 'APPROVED', commit_id: 'head-sha-1' },
      ],
    })

    await run({ github, context: makeContext() })

    expect(github.rest.pulls.requestReviewers).not.toHaveBeenCalled()
  })

  it('excludes bots from reviewers', async () => {
    const github = makeGithub({
      commits: [{ sha: 'abc123' }],
      mergedPRs: [{ ...unreleasedPR, user: { login: 'dependabot[bot]' } }],
      openPRs: [],
    })

    await run({ github, context: makeContext() })

    expect(github.rest.pulls.create).toHaveBeenCalled()
    expect(github.rest.pulls.requestReviewers).not.toHaveBeenCalled()
  })
})
