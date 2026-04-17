'use strict';

// MongoDB & Mongoose
const mongoose = require('mongoose');
const app = require('./app');
const {url, port} = require('./config');

// SWAGGER pour documentation de l'API
// const swaggerAutogen = require ('swagger-autogen');
// const outputFile = './swagger_output.json';
// swaggerAutogen(outputFile, ['./app.js']);

mongoose
    .connect(url + '/countries_api')
    .then(() => {
        console.log('Connecté à MongoDB');
    }).catch((error) => {
    console.log('Pas connecté :', error);
});

// Envoi de l'API sur le port
app.listen(port, () => {
    console.log("L'API écoute sur le port", port);
});