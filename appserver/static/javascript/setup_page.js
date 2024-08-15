"use strict";

const appName = "ta_for_sentinel_queries";
const appNamespace = {
    owner: "nobody",
    app: appName,
    sharing: "global",
};
const pwRealm = "ta_for_sentinel_queries_realm";

// Splunk Web Framework Provided files
require([
    "jquery", "splunkjs/splunk",
], function ($, splunkjs) {
    console.log("setup_page.js require(...) called");

    $("#setup_button").click(completeSetup);
    $("#clear_button").click(clearFields);
    

    $(document).ready(populateValues);

    async function populateValues() {
        console.log("ready! - populateValues called");
        // Values of inputs from setup_page_dashboard.xml

        let stage = 'Initializing the Splunk SDK for Javascript';
        try {
            // Initialize a Splunk Javascript SDK Service instance
            const http = new splunkjs.SplunkWebHttp();
            const service = new splunkjs.Service(
                http,
                appNamespace,
            );

            stage = 'Retrieving storagePasswords SDK collection';
            const passwords = service.storagePasswords(appNamespace);
            await passwords.fetch();

            stage = `Filtering passwords for the realm = ${pwRealm}`;
            const realmPasswords = passwords.list().filter((item) => {
                const key = item.name; // full key in the format <realm>:<name>:
                return key.startsWith(`${pwRealm}:`);
            });

            const $dropdown = $('#connection');
            $dropdown.append($('<option>', {
                value: "New...",
                text: "New..."
            }));

            console.log(`Found ${realmPasswords.length} passwords for realm ${pwRealm}`);

            if (realmPasswords.length > 0) {
                // Extract the names for the given realm
                const names = realmPasswords.map((item) => item.name.split(':')[1]); // extract the <name> part
                console.log(`Found names for realm ${pwRealm}:`, names);

                names.forEach(option => {
                    $dropdown.append($('<option>', {
                        value: option,
                        text: option
                    }));
                });

                // get the first password
                const firstPw = realmPasswords[0];
                const [client_id, log_analytics_workspace_id, tenant_id, client_secret] = firstPw.properties().clear_password.split("___");
                const pwName = firstPw.name.split(':')[1]
                $('#connection_name').val(pwName);
                $dropdown.val(pwName);
                
                $('#client_id_input').val(client_id);
                $('#client_secret_input').val(client_secret);
                $('#tenant_id_input').val(tenant_id);
                $('#log_analytics_workspace_id_input').val(log_analytics_workspace_id);
            } else {
                $dropdown.val("New...");
                console.log(`No passwords found for realm ${pwRealm}`);
            }

            $("#connection").on("change", handleConnectionChange)


        } catch (e) {
            console.warn(e);
            $('.error').show();
            $('#error_details').show();
            let errText = `Error encountered during stage: ${stage}<br>`;
            errText += (e.toString() === '[object Object]') ? '' : e.toString();
            if (e.hasOwnProperty('status')) errText += `<br>[${e.status}] `;
            if (e.hasOwnProperty('responseText')) errText += e.responseText;
            $('#error_details').html(errText);
        }
    }

    async function handleConnectionChange(event) {
        console.log("Dropdown value changed to:", $(this).val());
        const connectionName = $(this).val();

        if (connectionName == "New...") {
            clearFields();
            return;
        }

        let stage = 'Initializing the Splunk SDK for Javascript';
        try {
            // Initialize a Splunk Javascript SDK Service instance
            const http = new splunkjs.SplunkWebHttp();
            const service = new splunkjs.Service(
                http,
                appNamespace,
            );

              // The storage passwords key = <realm>:<name>:
              stage = 'Retrieving storagePasswords SDK collection';
              const passKey = `${pwRealm}:${connectionName}:`;
              const passwords = service.storagePasswords(appNamespace);
              await passwords.fetch();
              stage = `Checking for existing password for realm and password name = ${passKey}`;
              const existingPw = passwords.item(passKey);
              await existingPw;
              if (existingPw) {
                  const [client_id, log_analytics_workspace_id, tenant_id, client_secret] = existingPw.properties().clear_password.split("___");
                  $('#connection_name').val(connectionName);
                  $('#client_id_input').val(client_id);
                  $('#client_secret_input').val(client_secret);
                  $('#tenant_id_input').val(tenant_id);
                  $('#log_analytics_workspace_id_input').val(log_analytics_workspace_id);
              }
            } catch (e) {
                console.warn(e);
                $('.error').show();
                $('#error_details').show();
                let errText = `Error encountered during stage: ${stage}<br>`;
                errText += (e.toString() === '[object Object]') ? '' : e.toString();
                if (e.hasOwnProperty('status')) errText += `<br>[${e.status}] `;
                if (e.hasOwnProperty('responseText')) errText += e.responseText;
                $('#error_details').html(errText);
            }

    }

    async function clearFields() {
        $('#client_secret_input').val('');
        $('#tenant_id_input').val('');
        $('#log_analytics_workspace_id_input').val('');
        $('#client_id_input').val('');
        $('#connection_name').val('');
    }


    // onclick function for "Complete Setup" button from setup_page_dashboard.xml
    async function completeSetup() {
        console.log("setup_page.js completeSetup called");
        // Values of inputs from setup_page_dashboard.xml
        const clientSecretToSave = $('#client_secret_input').val();
        const tenantIdToSave = $('#tenant_id_input').val();
        const logAnalyticsWorkspaceIdToSave = $('#log_analytics_workspace_id_input').val();
        const clientIdToSave = $('#client_id_input').val();

        let stage = 'Initializing the Splunk SDK for Javascript';
        try {
            // Initialize a Splunk Javascript SDK Service instance
            const http = new splunkjs.SplunkWebHttp();
            const service = new splunkjs.Service(
                http,
                appNamespace,
            );
            // Get app.conf configuration
            stage = 'Retrieving configurations SDK collection';
            const configCollection = service.configurations(appNamespace);
            await configCollection.fetch();

            stage = `Retrieving app.conf values for ${appName}`;
            const appConfig = configCollection.item('app');
            await appConfig.fetch();
            stage = `Retrieving app.conf [install] stanza values for ${appName}`;
            const installStanza = appConfig.item('install');
            await installStanza.fetch();
            // Verify that app is not already configured
            // const isConfigured = installStanza.properties().is_configured;
            // if (isTrue(isConfigured)) {
            //     console.warn(`App is configured already (is_configured=${isConfigured}), skipping setup page...`);
            //     reloadApp(service);
            //     redirectToApp();
            // }
            // The storage passwords key = <realm>:<name>:
            stage = 'Retrieving storagePasswords SDK collection';
            const pwName = $('#connection_name').val();
            // confirm pwName is only letters or underscores
            if(pwName && !/^[a-zA-Z_]+$/.test(pwName)) {
                errText = 'Connection name can only contain letters or underscores';
                $('#error_details').show();
                $('#error_details').html(errText);
                return;
            }
            const passKey = `${pwRealm}:${pwName}:`;
            const passwords = service.storagePasswords(appNamespace);
            await passwords.fetch();
            stage = `Checking for existing password for realm and password name = ${passKey}`;
            const existingPw = passwords.item(passKey);
            await existingPw;
            function passwordCallback(err, resp) {
                if (err) throw err;
                stage = 'Setting app.conf [install] is_configured = 1'
                setIsConfigured(installStanza, 1);
                stage = `Reloading app ${appName} to register is_configured = 1 change`
                reloadApp(service);
                $('.success').show();
                stage = 'Redirecting to app home page'
                redirectToApp();
            }
            if (!existingPw) {
                // Secret doesn't exist, create new one
                stage = `Creating a new password for realm = ${pwRealm} and password name = ${pwName}`;
                passwords.create(
                    {
                        name: pwName,
                        password: clientIdToSave + '___' + logAnalyticsWorkspaceIdToSave + '___' + tenantIdToSave + '___' + clientSecretToSave,
                        realm: pwRealm,
                    }, passwordCallback);
            } else {
                // Secret exists, update to new value
                stage = `Updating existing password for realm = ${pwRealm} and password name = ${pwName}`;
                existingPw.update(
                    {
                        password: clientIdToSave + '___' + logAnalyticsWorkspaceIdToSave + '___' + tenantIdToSave + '___' + clientSecretToSave
                    }, passwordCallback);

            }
        } catch (e) {
            console.warn(e);
            $('.error').show();
            $('#error_details').show();
            let errText = `Error encountered during stage: ${stage}<br>`;
            errText += (e.toString() === '[object Object]') ? '' : e.toString();
            if (e.hasOwnProperty('status')) errText += `<br>[${e.status}] `;
            if (e.hasOwnProperty('responseText')) errText += e.responseText;
            $('#error_details').html(errText);
        }
    }

    async function setIsConfigured(installStanza, val) {
        await installStanza.update({
            is_configured: val
        });
    }

    async function reloadApp(service) {
        // In order for the app to register that it has been configured
        // it first needs to be reloaded
        var apps = service.apps();
        await apps.fetch();

        var app = apps.item(appName);
        await app.fetch();
        await app.reload();
    }

    function redirectToApp(waitMs) {
        setTimeout(() => {
            window.location.href = `/app/${appName}`;
        }, 800); // wait 800ms and redirect
    }

    function isTrue(v) {
        if (typeof (v) === typeof (true)) return v;
        if (typeof (v) === typeof (1)) return v !== 0;
        if (typeof (v) === typeof ('true')) {
            if (v.toLowerCase() === 'true') return true;
            if (v === 't') return true;
            if (v === '1') return true;
        }
        return false;
    }
});

//# sourceURL=setup_page.js