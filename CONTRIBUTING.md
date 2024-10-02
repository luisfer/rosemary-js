# Contributing to Rosemary.js

First off, thank you for considering contributing to Rosemary.js! It's people like you that make Rosemary.js such a great tool.

## Where do I go from here?

If you've noticed a bug or have a feature request, make sure to check our [Issues](https://github.com/luisfer/rosemary-js/issues) page to see if someone else in the community has already created a ticket. If not, go ahead and [make one](https://github.com/luisfer/rosemary-js/issues/new)!

## Fork & create a branch

If this is something you think you can fix, then [fork Rosemary.js](https://help.github.com/articles/fork-a-repo) and create a branch with a descriptive name.

A good branch name would be (where issue #325 is the ticket you're working on):

```sh
git checkout -b 325-add-ai-support
```

## Get the test suite running

Make sure you're using the latest version of Node.js and npm. Install the development dependencies:

```sh
npm install
```

Now you should be able to run the entire test suite using:

```sh
npm test
```

## Implement your fix or feature

At this point, you're ready to make your changes! Feel free to ask for help; everyone is a beginner at first.

## Get the style right

Your patch should follow the same conventions & pass the same code quality checks as the rest of the project. Run `npm run lint` to check your code style.

## Make a Pull Request

At this point, you should switch back to your master branch and make sure it's up to date with Rosemary.js's master branch:

```sh
git remote add upstream git@github.com:YOUR_USERNAME/rosemary-js.git
git checkout master
git pull upstream master
```

Then update your feature branch from your local copy of master, and push it!

```sh
git checkout 325-add-ai-support
git rebase master
git push --set-upstream origin 325-add-ai-support
```

Finally, go to GitHub and [make a Pull Request](https://help.github.com/articles/creating-a-pull-request) :D

## Keeping your Pull Request updated

If a maintainer asks you to "rebase" your PR, they're saying that a lot of code has changed, and that you need to update your branch so it's easier to merge.

To learn more about rebasing in Git, there are a lot of [good](https://git-scm.com/book/en/v2/Git-Branching-Rebasing) [resources](https://www.atlassian.com/git/tutorials/rewriting-history/git-rebase) but here's the suggested workflow:

```sh
git checkout 325-add-japanese-localization
git pull --rebase upstream master
git push --force-with-lease 325-add-japanese-localization
```

## Code review

A team member will review your pull request and provide feedback. Please be patient as pull requests are often reviewed in batches.

## Thank you!

Thank you for your contribution! We appreciate your time and effort to make Rosemary.js better.
