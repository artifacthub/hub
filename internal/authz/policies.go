package authz

var predefinedPolicies = map[string]string{
	"rbac.v1": `
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
	`,
}
