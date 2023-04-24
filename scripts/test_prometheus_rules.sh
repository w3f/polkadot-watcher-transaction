#!/bin/bash

set -euo pipefail
set -x

TEST_FOLDER="test/prometheus"
CHART_NAME="polkadot-watcher-transaction"
for file in $(find "${TEST_FOLDER}" -name *yaml | sed 's|^'"${TEST_FOLDER}"/'||'); do
    template_name=${file##*/}

    echo helm template --set monitoring=true -s "templates/${template_name}" "charts/${CHART_NAME}"

    helm template --set prometheusRules.enabled=true --set subscriber.modules.transferEventScanner.enabled=true --set subscriber.modules.balanceBelowThreshold.enabled=false -s "templates/${template_name}" "charts/${CHART_NAME}" | yq e '.spec' - | promtool check rules /dev/stdin
    helm template --set prometheusRules.enabled=true --set subscriber.modules.transferEventScanner.enabled=true --set subscriber.modules.balanceBelowThreshold.enabled=false -s "templates/${template_name}" "charts/${CHART_NAME}" | yq e '.spec' - | promtool test rules "${TEST_FOLDER}/${template_name}"
done