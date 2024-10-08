# Contributing

After plenty of experimental development, rJS is now in a release state. Contributions are very welcome. Feel free to join if you are a developer just as ambituous as the project.

> As the framework is progressing, we are looking for eager contributors to grow the core team.

## Development

By design, rJS does not only aim for a simple user interface, but also simple development. The codebase is organised as a monorepo with NPM workspaces. The main package is `@rapidjs.org/rjs`. Any contribution must be associated with an issue on GitHub in order to be traceable (‘one-issue-per-contribution’). A common type of contribution is a bug fix. A contribution is only accepted if the related issue was labeled `approved-for-development`.

> Constributions that are as small as fixing a typo represent an exception to the‘one-issue-per-contribution’ rule.

### Prerequisites

- Git
- Node.js
- NPM

``` console
git clone git@github.com:rapidjs-org/rJS.git
cd rJS
```

### Workflow

The follwoing stages need to be visited at least once upon developing towards a single contribution:

#### Branching

A single contribution must be developed on an isolated branch. Since contributions are supposed to associate with an existing issues, the issue ID must be stated in the branch name. The name must be according to the template `<ISSUE-ID>-<LOWERCASE-DESCRIPTION>` (e.g. `1-fix-hello-world-typo`).

> Using the ‘Create a Branch’ feature that is available in the issue tab on GitHub will create a valid branch.

#### Testing

Upfront, as well as after each complete implementation, run the following commands in the project root:

``` console
npm run build
npm run test
```

> To start a watch-build environment, run `npm run debug:watch -w @rapidjs.org/<PACKAGE-NAME>`.

Evidently, all test cases need to run with success after adding new code. Evidently, all test cases need to be fulfilled before proposing an integration of a contribution. For new features, the test suite shall be extended in order to cover the new behaviour. rJS utilises the [rJS Testing](https://github.com/rapidjs-org/testing) framework.

> No worries, comprising integration tests are prioritised over unit tests. The main goal is to prove a fully-functional server interface.

#### Implementing

Implement the contribution changes in code. Before each commit, both a mandatory linter and formatter are run automatically. Commit messages shall comply with the following rules:

- Only the first letter capitalised (merely acronyms may be uppercase)
- Subject phrased with imperative
- Simple and direct message

> **Example**: `Add development mode flag to client cache`

#### Proposing Integration

Integration of complete contributions are expected through a pull request. The name of the pull request must apply to the template `Closes #<ISSUE-ID>` (e.g. `Closes #1`) – reconnecting with the respective issue.

#### Documenting

The official [rJS Documentation](https://rapidjs.org/docs) is sourced in [this](https://github.com/rapidjs-org/documentation) GitHub repository. In case a contribution renders the documentation incorrect or incomplete, it is supposed to be edited in accordance.

## Copyright and License

By providing a contribution, all associated artefacts are going to be published under the applicable [license](https://github.com/rapidjs-org/rJS/blob/main/LICENSE). Furthermore, the respective intellectual property is transferred without restriction to the rJS copyright holders. A contribution will nonetheless be credited to the author via source control, such as annotated commits.

## Integration

As of now, integrations of contributions are exlcusively done by core team members (usually with a merge commit). 