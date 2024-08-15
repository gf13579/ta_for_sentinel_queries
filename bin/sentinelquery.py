#!/usr/bin/env python

import sys
import os
import requests
from loguru import logger
import json
import urllib3
import time


sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
from splunklib.searchcommands import dispatch, GeneratingCommand, Configuration, Option, validators   # noqa E402

# For VS Code debugging
"""
sys.path.append(
    os.path.join(os.environ["SPLUNK_HOME"], "etc", "apps", "SA-VSCode", "bin")
)

# Uncomment to enable debugging with VS Code
import splunk_debug as dbg

dbg.enable_debugging(timeout=20)
"""


log_file = os.environ["SPLUNK_HOME"] + "/var/log/splunk/ta_for_sentinel_queries.log"
logger.remove()
logger.add(sink=log_file, level="INFO")
logger.add(sink=sys.stderr, level="ERROR")


def authenticate(url, resource, username, password):
    payload = {
        "grant_type": "client_credentials",
        "client_id": username,
        "client_secret": password,
        "Content-Type": "x-www-form-urlencoded",
        "resource": resource,
    }

    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    ApiReturn = requests.post(url, data=payload, verify=False)  # nosec
    ApiToken = json.loads(ApiReturn.content)["access_token"]

    return {"Authorization": f"Bearer {ApiToken}", "Content-Type": "application/json"}

from datetime import datetime

def epoch_to_iso8601_period(earliest_time, latest_time):
    # Convert epoch time to datetime objects
    earliest_datetime = datetime.utcfromtimestamp(earliest_time)
    latest_datetime = datetime.utcfromtimestamp(latest_time)

    # Calculate the time difference
    time_difference = latest_datetime - earliest_datetime

    # Extract days, seconds, and microseconds from the time difference
    days = time_difference.days
    seconds = time_difference.seconds
    microseconds = time_difference.microseconds

    # Calculate the ISO8601 period format
    iso8601_period = "P"
    if days > 0:
        iso8601_period += f"{days}D"
    if seconds > 0 or microseconds > 0:
        iso8601_period += "T"
        if seconds > 0:
            iso8601_period += f"{seconds}S"
        if microseconds > 0:
            iso8601_period += f"{microseconds}us"

    return iso8601_period



@Configuration()
class sentinelqueryCommand(GeneratingCommand):
    """ %(synopsis)

    ##Syntax

    %(syntax)

    ##Description

    %(description)

    """

    query = Option(
        doc='''**Syntax:** **query=***<value>*
        **Description:** The query to run in Sentinel.''',
        require=True)
    
    connection_name = Option(
        doc='''**Syntax:** **connection_name=***<value>*
        **Description:** The connection name identifying the remote Log Analytics Workspace.''',
        require=False)

    def generate(self):

        query = self.query
        connection_name = "settings"
        logger.info(f"self.connection_name is {self.connection_name}")
        if self.connection_name is not None:
            connection_name = self.connection_name

        earliest_time = self._metadata.searchinfo.earliest_time
        latest_time = self._metadata.searchinfo.latest_time

        timespan = epoch_to_iso8601_period(earliest_time, latest_time)
        
        settings = None
        storage_passwords = self.service.storage_passwords
        for k in storage_passwords:
            name = k.name.split(":", 1)[1]
            name = name.rstrip(":")
            p = str(k.content.get("clear_password"))
            realm = str(k.content.get("realm"))
            if realm == "ta_for_sentinel_queries_realm" and name == connection_name:
                logger.info("Found settings for " + connection_name)
                settings = p
                break

        if settings is None:
            message = "No settings defined. Exiting"
            logger.error(message)
            return

        client_id, log_analytics_workspace_id, tenant_id, client_secret = settings.split("___")

        logger.info("client_id is " + client_id)

        login_url = "https://login.microsoftonline.com/" + tenant_id + "/oauth2/token"
        resource = "https://api.loganalytics.io"
        url = (
            "https://api.loganalytics.io/v1/workspaces/" + log_analytics_workspace_id + "/query"
        )

        Headers = authenticate(login_url, resource, client_id, client_secret)
        params = {"query": query, "timespan": timespan}

        result = requests.get(url, params=params, headers=Headers, verify=False)  # nosec

        # logger.info("result.json() is " + str(result.json()))

        columns = result.json()["tables"][0]["columns"]
        column_length = len(result.json()["tables"][0]["columns"])

        for row in result.json()["tables"][0]["rows"]:
            data = {}

            for i in range(0, column_length):
                data[columns[i]["name"]] = row[i]

            try:
                d = json.dumps(data)
                yield {'_time': time.time(), '_raw': d}
            except Exception as e:
                # logger.warn("Failed to parse " + str(data))
                logger.warn("Exception: " + str(e))


dispatch(sentinelqueryCommand, sys.argv, sys.stdin, sys.stdout, __name__)
