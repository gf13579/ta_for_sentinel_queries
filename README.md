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

- Modify config ui to take a `connection_name` (lowercase and underscore) and use that instead of `settings` in passwords.conf
- Add dropdown (`<datalist>` element) listing call `connection_name` values i.e. username values from storage-passwords for this realm
- Populate ui elements on (re)selection of `connection_name`
- Ensure the Complete Setup event handler takes `connection_name` into account
- When the UI is done, update the py code to support `connection_name` as a parameter

### General

- Handle errors better - send a query starting with a pipe to trigger one
- Forcibly remove a pipe from the start of queries, if present?
- Support multiple cred+workspace configurations