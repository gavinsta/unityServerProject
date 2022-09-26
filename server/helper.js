'use strict'
module.exports = {
    /**
     * Check if a given room contains an instance of this player name already
     * @param {Room} room 
     * @param {String} playerName 
     * @returns 
     */
    checkRoomForPlayerName: function (room, playerName) {
        if (!room.players) {
            return false;
        }
        if (room.players.length < 1) {
            return false;
        }
        for (var i = 0, len = room.players.length; i < len; i++) {
            if (room.players[i].playerName === playerName) {
                //player name is in room
                return true;
            }
        };
        return false;
    },
    /**
     * check if the controller key is 'available'
     * @param {Object} room the room object
     * @param {String} controllerKey the controller key
     * @returns 
     */
    checkControllerAvailability: function (room, controllerKey) {
        if (room) {
            //check that this is a key already added into the room
            if (room.controllers.has(controllerKey)) {
                console.log(`Room: ${room.roomCode} has controller with key: ${controllerKey}`)
                if (room.controllers.get(controllerKey) == '') return true
            }
            else {
                console.log(`Room ${room.roomCode} does not have controller with key: ${controllerKey}`);
                return false;
            }
        }
        return false;
    },
    /**
     * Find and remove the player from the room
     * @param {Room Object} room 
     * @param {String} playerName 
     * @returns Successfully removing a player or not
     */
    removePlayerFromRoom: function (room, playerName) {
        if (room.players.length < 1) {
            //no players to remove
            return false;
        }
        let index = -1;
        for (var i = 0, len = room.players.length; i < len; i++) {
            if (room.players[i].playerName === playerName) {
                index = i;
            }
        }
        if (index !== -1) {
            room.players = room.players.splice(index, 1);
            return true;
        }

        return false;
    },
    /**
     * Use to generate a random code. Generation of Controller Keys should be left up to Unity
     * @param {number} length 
     * @param {boolean} randomAlternate whether the code will switch between letter and number randomly
     */
    generateKey: function (length, randomAlternate = true) {
        var s = '';
        var randomCapitalChar = function () {
            var n = Math.floor(Math.random() * 26) + 65;
            return String.fromCharCode(n);
        }
        var randomNumber = function () {
            var n = Math.floor(Math.random() * 10);
            return n;
        }
        while (s.length < length) {
            if (randomAlternate) {
                s += Math.round(Math.random()) ? randomCapitalChar() : randomNumber();
            }
            else {
                s += randomCapitalChar();
                s += randomNumber();
            }
        }
        return s;
    },
    /**
     * 
     * @returns A random color name
     */
    randomColor: function () {
        const colors = ['Maroon', 'Crimson', 'Red', 'Orange', 'Gold', 'Tangerine', 'Yellow', 'Lime', 'Green', 'Teal', 'Blue', 'Azure', 'Indigo', 'Violet'];
        return colors.at(Math.floor(Math.random() * colors.length));
    }
}