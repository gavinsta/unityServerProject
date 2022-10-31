'use strict'
module.exports = {
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