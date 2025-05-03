import express from 'express'
import constructorMethod from './routes/index.js'
import exphbs from 'express-handlebars';



const app = express()

app.use('/public', express.static('public'));

app.use(express.json())
app.use(express.urlencoded({extended: true}));
app.engine('handlebars', exphbs.engine({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

constructorMethod(app)

app.listen(3000, () => {
    console.log("Server is running on 3000")
})



