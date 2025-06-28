# Define colors
GREEN="\[\e[32m\]"
BLUE="\[\e[34m\]"
YELLOW="\[\e[33m\]"
MAGENTA="\[\e[35m\]"
RED="\[\e[31m\]"
RESET="\[\e[0m\]"

alias vi=vim
alias ls='ls --color'
alias ll='ls -l'

# Set up the prompt
export PS1="${GREEN}\u${RESET}${RED}@${BLUE}\h${RESET}:${YELLOW}\w${RESET}$ "

