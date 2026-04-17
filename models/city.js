const mongoose = require('mongoose');

const City = mongoose.model('City', {
    name: String,
    uuid: String,
    country: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Country',
    },
    population: Number,
});

module.exports = City;