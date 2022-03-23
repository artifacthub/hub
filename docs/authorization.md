# Authorization

Artifact Hub includes a fine-grained authorization mechanism that allows organizations to define what actions can be performed by their members. It is based on customizable authorization policies that are enforced by the [Open Policy Agent](https://www.openpolicyagent.org). Policies are written using [rego](https://www.openpolicyagent.org/docs/latest/#rego) and their data files are expected to be [json](https://www.json.org/json-en.html) documents. Out of the box, when the authorization mechanism is disabled, all members of an organization can perform all actions on it.

Authorization can be set up using [predefined](#using-predefined-policies) or [custom policies](#using-custom-policies) from the Artifact Hub control panel, in the organization settings tab.

## Using predefined policies

Using a predefined policy is the easiest way of setting up authorization in Artifact Hub. In this case, organizations only need to provide **a data file** in json format that conforms to the policy. This data file will define what actions each of the members are allowed to perform, and its structure is tightly coupled to the policy. At the moment only one predefined policy, named [`rbac.v1`](#rbacv1), is available. It's a flexible roles based authorization policy that can be easily customized.

### rbac.v1

#### Policy definition

The following block of code is the definition of the `rbac.v1` policy (displayed only for informational purposes).

When an organization enables authorization using predefined policies, they'll be offered a list of options. Once one is selected, the policy will be displayed so that it can be inspected (read only) and the authorization administrator will be able to provide a data file for it. At the moment this is the only predefined policy available.

```rego
package artifacthub.authz

# Get user allowed actions
allowed_actions[action] {
    # Owner can perform all actions
    user_roles[_] == "owner"
    action := "all"
}
allowed_actions[action] {
    # Users can perform actions allowed for their roles
    action := data.roles[role].allowed_actions[_]
    user_roles[_] == role
}

# Get user roles
user_roles[role] {
    data.roles[role].users[_] == input.user
}
```

#### Data file

The data file required for the `rbac.v1` policy **must** have the following structure:

```json
{
    "roles": {
        "owner": {
            "users": [
                "user1"
            ]
        },
        "customRole1": {
            "users": [
                "user2"
            ],
            "allowed_actions": [
                "addOrganizationMember",
                "deleteOrganizationMember"
            ]
        },
        "customRole2": {
            "users": [
                "user3",
                "user4"
            ],
            "allowed_actions": [
                "updateOrganization"
            ]
        }
    }
}'
```

Organizations can define their own roles in this data file. They can define as many as they need, and assign them to users using the `users` key. In this policy there is an special role named `owner`. Users with this role assigned will be able to perform all actions. Using this role is optional and organizations which don't need it may just not include it in the data file.

Users are identified by their aliases. Organizations can get their members' aliases from the members tab in the control panel. Actions available can be found below in the [reference section](#actions).

## Using custom policies

Organizations can also define their own authorization policies. This will give them complete flexibility for their authorization setup, including the ability to define their own data file with a custom structure.

Custom policies **must** be able to process the [queries](#queries) defined in the reference section. The input they will receive is also documented below. Policy data file must be a valid json document and the top level value **must** be an object.

## Integration

The Artifact Hub HTTP API includes an endpoint that allows organizations to update their authorization policy. This can be used to automate the generation and synchronization of the data file for your authorization policy based on information available in an external system.

## Reference

### Actions

This is the list of Artifact Hub actions that can be used in policies and data files:

- *addOrganizationMember*
- *addOrganizationRepository*
- *deleteOrganization*
- *deleteOrganizationMember*
- *deleteOrganizationRepository*
- *getAuthorizationPolicy*
- *transferOrganizationRepository*
- *updateAuthorizationPolicy*
- *updateOrganization*
- *updateOrganizationRepository*

In addition to the actions just listed, there is a special one named `all` that grants a user permission to perform all actions.

### Queries

When users try to perform certain actions in the control panel, Artifact Hub will query the organizations authorization policy to check if they should be allowed or not. Predefined authorization policies are already prepared to process the required query, but when using custom policies it's important that they are able to handle it as well. At the moment, the only query your authorization policy will receive is `data.artifacthub.authz.allowed_actions`.

- **data.artifacthub.authz.allowed_actions**

This query is used to get all the actions the user is allowed to perform in the organization. It should return a *list of actions*, and the input used will be:

```json
{
    "user": "userAlias"
}
```

An empty list means the user cannot perform any action. If the special `all` action is included in the list, the user will be allowed to perform all actions in the organization.

The output could look like this:

```json
[
    "addOrganizationMember",
    "addOrganizationRepository",
    "transferOrganizationRepository"
]
```
