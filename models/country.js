const mongoose = require('mongoose');

const Country = mongoose.model('Country', {
    name: String,
    code: String,
    uuid: String,
    cities : [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'City',
        },
    ],
    europeanUnion: Boolean,
});

module.exports = Country;