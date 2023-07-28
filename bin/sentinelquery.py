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

logger.info("Early test")


def get_token(url, resource, username, password):
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

    return {"Authorization": "Bearer " + ApiToken, "Content-Type": "application/json"}


@Configuration()
class sentinelqueryCommand(GeneratingCommand):
    """ %(synopsis)

    ##Syntax

    %(syntax)

    ##Description

    %(description)

    """

    # How we could pass a parameter through and use it (self.some_param) in the command
    query = Option(
        doc='''**Syntax:** **some_param=***<value>*
        **Description:** some parameter we may use at some point.''',
        require=True)

    def generate(self):

        # To connect with Splunk, use the instantiated service object which is created
        # using the server-uri and other meta details and can be accessed as shown below
        # Example:-
        #    service = self.service

        query = self.query

        settings = None
        storage_passwords = self.service.storage_passwords
        for k in storage_passwords:
            p = str(k.content.get("clear_password"))
            realm = str(k.content.get("realm"))
            if realm == "ta_for_sentinel_queries_realm":
                settings = p
                break

        # yield {"event": settings}
        # return

        if settings is None:
            message = "No settings defined. Exiting"
            logger.error(message)
            return

        client_id, log_analytics_workspace_id, tenant_id, client_secret = settings.split("___")

        loginURL = "https://login.microsoftonline.com/" + tenant_id + "/oauth2/token"
        resource = "https://api.loganalytics.io"
        url = (
            "https://api.loganalytics.io/v1/workspaces/" + log_analytics_workspace_id + "/query"
        )

        Headers = get_token(loginURL, resource, client_id, client_secret)
        params = {"query": query}

        result = requests.get(url, params=params, headers=Headers, verify=False)  # nosec

        # yield {"event": str(result.json())}
        # return

        columns = result.json()["tables"][0]["columns"]
        column_length = len(result.json()["tables"][0]["columns"])

        for row in result.json()["tables"][0]["rows"]:
            data = {}

            for i in range(0, column_length):
                data[columns[i]["name"]] = row[i]

            # data = json.dumps(data)

            # yield data
            try:
                d = json.dumps(data)
                yield {'_time': time.time(), '_raw': d}
            except Exception as e:
                print("Bad data?" + str(data), file=sys.stderr)
                print("Exception: " + str(e))
                logger.warn("Failed to parse " + str(data))
                logger.warn("Exception: " + str(e))


        # return

    # event = helper.new_event(data, host=None, source=None,
    # sourcetype=cust_source_type, done=True, unbroken=True)
        try:
            # ew.write_event(event)
            print(str(data))
        except Exception as e:
            raise e

        # yield {"event": str(result.json())}
        # return

        for result in result.json():
            yield result


dispatch(sentinelqueryCommand, sys.argv, sys.stdin, sys.stdout, __name__)
