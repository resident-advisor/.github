const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

const workflow = yaml.load(fs.readFileSync(path.join(__dirname, 'story-id.yml'), 'utf8'))
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
const script = new AsyncFunction('github', 'context', 'core', workflow.jobs['story-id'].steps[0].with.script)

const run = async ({ branch = 'feature', title = 'Add thing', labels = [], userType = 'User' } = {}) => {
  const github = {
    rest: {
      pulls: {
        get: jest.fn().mockResolvedValue({
          data: { head: { ref: branch }, title, labels: labels.map((name) => ({ name })), user: { type: userType } },
        }),
      },
    },
  }
  const context = { repo: { owner: 'o', repo: 'r' }, payload: { pull_request: { number: 1, title: 'stale' } } }
  const core = { setFailed: jest.fn() }
  await script(github, context, core)
  return core.setFailed
}

describe('story-id', () => {
  it.each([
    ['story id in branch', { branch: 'feature/EPD-123-thing' }],
    ['story id in title', { title: 'EPD-123: Add thing' }],
    ['lowercase story id', { branch: 'epd-123-thing' }],
    ['chore label', { labels: ['chore'] }],
    ['bot author', { userType: 'Bot' }],
    ['revert branch', { branch: 'revert-42-feature' }],
    ['revert title', { title: 'Revert "Add thing"' }],
    ['develop head', { branch: 'develop' }],
    ['main head', { branch: 'main' }],
    ['master head', { branch: 'master' }],
    ['release head', { branch: 'release/1.2.0' }],
  ])('passes with %s', async (_, pr) => {
    expect(await run(pr)).not.toHaveBeenCalled()
  })

  it.each([
    ['no story id', {}],
    ['EPDF id', { title: 'EPDF-123: Add thing' }],
    ['story id inside a longer word', { branch: 'XEPD-123' }],
    ['other label', { labels: ['bug'] }],
  ])('fails with %s', async (_, pr) => {
    expect(await run(pr)).toHaveBeenCalledWith(expect.stringContaining('No story id found'))
  })
})
