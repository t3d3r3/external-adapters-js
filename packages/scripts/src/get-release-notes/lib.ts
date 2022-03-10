import { getWorkspacePackages } from '../workspace'
import { readFileSync, readdirSync } from 'fs'

const CHANGESET_DIRECTORY = '.changeset'

interface changelog {
  major: Set<string>
  minor: Set<string>
  patch: Set<string>
}

export function printReleaseNotes(): void {
  const changelog: changelog = {
    major: new Set(),
    minor: new Set(),
    patch: new Set(),
  }
  const changedAdapterSet: Set<string> = new Set()

  const changesetFilenames = getChangesetFilenames()

  changesetFilenames.map((filename) => {
    const fileContents = getFile(`${CHANGESET_DIRECTORY}/${filename}`).split('\n')
    const changeSummary = fileContents[fileContents.length - 2]

    const changedAdapters = fileContents.filter((line) => line.indexOf('@chainlink') !== -1)

    changedAdapters.map((line) => {
      const adapterNameDirty = line.match(/'@chainlink\/.+'/)
      const adapterName = adapterNameDirty ? adapterNameDirty[0].replace(/'/g, '') : ''
      changedAdapterSet.add(adapterName)
      const changeType = line.substring(line.length - 5) || ''
      changelog[changeType as keyof typeof changelog].add(changeSummary)
    })
  })

  const major = getChangelogMarkdown(changelog.major)
  const minor = getChangelogMarkdown(changelog.minor)
  const patch = getChangelogMarkdown(changelog.patch)

  console.log(
    `
  # Changeset
  ## Breaking changes (major)
  ${major}
  ## Features (minor)
  ${minor}
  ## Bug fixes (patch)
  ${patch}`.replace(/  +/g, ''),
  )

  const workspacePackages = getWorkspacePackages(['core'])
  console.log(`|    Adapter    | Version |`)
  console.log(`| :-----------: | :-----: |`)
  for (let item of changedAdapterSet) {
    workspacePackages
      .filter((pkg) => pkg.name === item)
      .map((changedPkg) => console.log('|', changedPkg.name, '|', changedPkg.version, '|'))
  }
}

function getFile(path: string) {
  return readFileSync(path, 'utf-8')
}

function getChangesetFilenames() {
  return readdirSync(CHANGESET_DIRECTORY).filter((fn) => {
    return fn.endsWith('.md') && fn !== 'README.md'
  })
}

function getChangelogMarkdown(changelogSet: Set<string>) {
  return Array.from(changelogSet)
    .map((change) => `- ${change}`)
    .join('\n')
}
