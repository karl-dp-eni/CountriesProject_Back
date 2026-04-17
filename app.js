const City = require('./models/city');
const Country = require('./models/country');

// Express
const express = require('express');
const {body, validationResult} = require('express-validator');
const app = express();

app.use(express.urlencoded({extended: true}));
app.use(express.json());

// Swagger - Génération de la doc de l'API
const swaggerUi = require('swagger-ui-express');
const swaggerDoc = require('./swagger_output.json');
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc))

// Mock
async function dbReset() {
    const france = new Country({
        name: 'France',
        code: 'FR',
        uuid: crypto.randomUUID(),
    });
    await france.save();

    const rennes = new City({
        name: 'Rennes',
        uuid: crypto.randomUUID(),
    });

    const nantes = new City({
        name: 'Nantes',
        uuid: crypto.randomUUID(),
        sisterCity: rennes._id,
    });

    rennes.sisterCity = nantes._id;

    rennes.save();
    nantes.save();

    france.cities.push(nantes);
    france.cities.push(rennes);

    france.save();
}

dbReset();

// Middleware
app.use((req, res, next) => {
    console.log('method: ', req.method, ' url: ', req.url, ' user-agent: ', req.get('User-Agent'));
    next();
});

// ------------ PAYS --------------//
// Route principale qui permet d'afficher les pays
app.get('/countries', async (req, res) => {
    const countries = await Country.find().populate('cities');
    res.json(countries);
});

// CRUD - CREATE nouveau Pays
app.post('/countries',
    body('name')
        .isLength({min: 3})
        .withMessage('Le Pays doit avoir au moins 3 caractères'),
    body('code')
        .notEmpty()
        .withMessage('Le code pays est obligatoire'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json(errors);
        }

        const generatedUuid = crypto.randomUUID();

        await Country.create({
            name: req.body.name,
            code: req.body.code,
            uuid: generatedUuid,
        }).then((country) => {
            res.status(201).json(country);
        });
    });

// Afficher un pays en détail
app.get('/countries/:code', async (req, res) => {
    await Country.findOne({ code: req.params.code }).then((country) => {
        res.status(200).json(country);
    });
});

// CRUD - UPDATE le pays par le code
app.put('/countries/updateByCode/:code', async (req, res) => {
    console.log('body', req.body);

    await Country.findOneAndUpdate(
        { code: req.params.code },
        { name: req.params.name },
    ).then((country) => res.status(200).json(country));
});

// CRUD - UPDATE le pays par le uuid
app.put('/countries/updateById/:uuid', async (req, res) => {
    console.log('body', req.body);

    await Country.findOneAndUpdate(
        { uuid: req.params.uuid },
        { name: req.params.name },
        { new: true },
    ).then((country) => res.status(200).json(country));
});

// CRUD - DELETE pays
app.delete('/countries/:code', async (req, res) => {
    await Country.findOneAndDelete(
        { code: req.params.code },
    ).then((response) => {
        res.status(200).json(response);
    });
});

// Erreur si page non existante
app.use((req, res) => {
    res.status(404).send("Page non trouvée");
})

// ---------- VILLES ------------//

app.get('/cities', (req, res) => {
    City.find()
        .populate('sisterCity')
        .then((cities) => {
            console.log('cities', cities);

            res.json(cities);
        });
});

// CRUD - CREATE
app.post('/cities', body('name')
        .isLength({min: 3})
        .withMessage('La ville doit avoir au moins 3 caractères'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json(errors);
        }
        await City.create({
            name: req.body.name,
            uuid: crypto.randomUUID(),
        });

        await City.find({name: req.body.name})
            .then((city) => res.json(city));
    },
);

app.get('./cities/:uuid', (req, res) => {
    City.findOne({uuid: req.params.uuid}).then((city) => {
        if (city) {
            res.send(city.name);
        } else {
            res.status(404).send('Ville non trouvée');
        }
    });
});

app.post('/cities/update', async (req, res) => {
    await City.findOneAndUpdate(
        {uuid: req.params.uuid},
        {name: req.params.name},
    );
    res.redirect('/cities');
});

// EXPORT
module.exports = app;