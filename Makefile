.PHONY: deploy
deploy:
	act --job deploy --eventpath .github/workflow_dispatch.json --platform ubuntu-24.04=catthehacker/ubuntu:act-22.04
