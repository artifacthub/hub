package authz

var predefinedPolicies = map[string]string{
	"rbac.v1": `
		package artifacthub.authz

		# By default, deny requests
		default allow = false

		# Allow the action if the user is allowed to perform it
		allow {
			# Allow if user's role is owner
			data.roles.owner.users[_] == input.user
		}
		allow {
			# Allow if user's role is allowed to perform this action
			allowed_actions[_] == input.action
		}

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
	`,
}
