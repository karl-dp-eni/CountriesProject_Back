const mongoose = require('mongoose');

const City = mongoose.model('City', {
    name: String,
    uuid: String,
    sisterCity: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'City',
    },
});

module.exports = City;