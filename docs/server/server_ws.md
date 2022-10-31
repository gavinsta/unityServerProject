# Room (object)
## Properties
#### `controllers`
`Map()` of controller `keys` to the `Player` objects
#### `choiceContexts`
`Map()` of `controllerkey`s to the `ChoiceContext` object of each player character. These choice contexts are updated during the runtime of the game and will always be saved on the server. When a new player client successfully connects to the respective controller, they are automatically served the information from the `choiceContext` according to the`controllerkey`.

## Methods
#### `sendCurrentChoices()`
Sends the current choices to the host client (Unity).
Message should be bundled like so:
``` json
{
	type: COMMAND,
	header: choices,
	
	data:
	{
		prompt://a way to tell what the input was in response to.
		//a bundle of player choice objects
		choices: [
			player1Choice,
			player2Choice,
			player3Choice,
			player4Choice, //etc...
		],
	},
}
