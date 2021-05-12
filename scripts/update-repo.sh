set +e  # Grep succeeds with nonzero exit codes to show results.

git status | grep modified
if [ $? -eq 0 ]
then
    set -e
    git config --global user.name "github-actions[bot]"
    git config --global user.email "41898282+github-actions[bot]@users.noreply.github.com"
    git add index.html
    git add changelog/README.md
    git commit -m "Rebuild Changelog"
    git push
else
    set -e
    echo "No changes since last run"
fi
