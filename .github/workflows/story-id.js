module.exports = async ({ github, context, core }) => {
  // Ruleset workflows ignore label and title edits, so a re-run must read the live PR
  // rather than the original event payload.
  const { data: pr } = await github.rest.pulls.get({
    ...context.repo,
    pull_number: context.payload.pull_request.number,
  })
  const branch = pr.head.ref
  const title = pr.title

  const hasStoryId = /(?<![a-z0-9])EPD-\d+/i.test(`${branch} ${title}`)
  const isChore = pr.labels.some(({ name }) => name === 'chore')
  const isBot = pr.user.type === 'Bot'
  const isRevert = branch.startsWith('revert-') || title.includes('Revert "')
  const isRelease = ['develop', 'main', 'master'].includes(branch) || branch.startsWith('release/')

  if (!hasStoryId && !isChore && !isBot && !isRevert && !isRelease) {
    core.setFailed(
      'No story id found. Add an EPD id (e.g. EPD-1234) to the branch name or PR title, ' +
        'or add the "chore" label if there is no story, then re-run this check.',
    )
  }
}
