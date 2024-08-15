# TA For Sentinel Queries

## Overview

The TA for Sentinel Queries provides a custom command you can use to search a Microsoft Log Analytics Workspace, allowing you to run arbitrary queries across Microsoft Sentinel data and process the results within Splunk.

## Installation

- Install the TA
- Use the TA's setup page to configure details of the target workspace (client id, client secret, tenant id, log analytics workspace id)
- Test - try a query like `| sentinelquery query="SigninLogs | where TimeGenerated > ago(5d)"`

By default the TA will look for a connection whose name was setup (in the setup page) as `settings`. To override this, specify `connection_name="the-connection-name"`.

## Troubleshooting

Search `index=_internal source="*ta_for_sentinel_queries.log"`

## To do

### Support for multiple workspaces

- When the UI is done, update the py code to support `connection_name` as a parameter, defaulting to "settings"
- Modify config ui validate that `connection_name` is lowercase and underscores only
- Add code to tell the user 

### General

- Consider refactoring `populateValues` to use `handleConnectionChange` for displaying details of the first found cred rather than repeating code
- Handle errors better - send a query starting with a pipe to trigger one
- Forcibly remove a pipe from the start of queries, if present?
- Support multiple cred+workspace configurations