# TA For Sentinel Queries

## Overview

The TA for Sentinel Queries provides a custom command you can use to search a Microsoft Log Analytics Workspace, allowing you to run arbitrary queries across Microsoft Sentinel data and process the results within Splunk.

## Installation

- Install the TA
- Use the TA's setup page to configure details of the target workspace (client id, client secret, tenant id, log analytics workspace id)
- Test - try a query like `| sentinelquery query="SigninLogs | where TimeGenerated > ago(5d)"`

## Troubleshooting

Search `index=_internal source="*ta_for_sentinel_queries.log"`

## To do

### Support for multiple workspaces

- Switch from `"settings"` in passwords.conf to using the new `connection_name` field
- Add text highlighting the app currently doesn't support deletion of old credentials
- Ensure the Complete Setup event handler takes `connection_name` into account
- When the UI is done, update the py code to support `connection_name` as a parameter, defaulting to "settings"
- Modify config ui validate that `connection_name` is lowercase and underscores only
- Add code to tell the user 

### General

- Handle errors better - send a query starting with a pipe to trigger one
- Forcibly remove a pipe from the start of queries, if present?
- Support multiple cred+workspace configurations