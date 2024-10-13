let express = require('express');
let cors = require('cors');
let { graphqlHTTP } = require('express-graphql');
var graphql = require('graphql');
import { GraphQLList, GraphQLString, GraphQLBoolean } from "graphql";
import { Character } from "./model";
import { cleanData, isInCategories } from "./utils";

// prepare data 
const Brutdata: Character[] = require('../data/DokkanCharacterData.json')
const data = cleanData(Brutdata);

// data type
var imageType = new graphql.GraphQLObjectType({
  name: 'Image',
  fields: {
    simpleImage: { type: GraphQLBoolean! },
    simpleUrl: { type: GraphQLString },
    complexeUrl: { type: GraphQLString },
  }
})

var characterLiteType = new graphql.GraphQLObjectType({
  name: 'Card',
  fields: {
    id: {
      type: graphql.GraphQLNonNull(graphql.GraphQLString),
      description: 'The id of the character'
    },
    name: { type: GraphQLString },
    rarity: { type: GraphQLString },
    class: { type: GraphQLString },
    type: { type: GraphQLString },
    imageURL: { type: imageType },
    leaderSkill: { type: GraphQLString },
    ezaLeaderSkill: { type: GraphQLString },
    superAttack: { type: GraphQLString },
  }
});

// query
var queryType = new graphql.GraphQLObjectType({
  name: 'Query',
  fields: {
    characters: {
      type: new GraphQLList(characterLiteType),
      args: {
        categories: { type: graphql.GraphQLList(graphql.GraphQLString) },
      },
      // @ts-ignore
      resolve: (_notUsed, {categories}) => {
        return data.filter(character => isInCategories(character, categories))
      }
    },
    lastCharacters: {
      type: new GraphQLList(characterLiteType),
      resolve: () => {
        return data.slice(0, 100);
      }
    },
    allCharacters: {
      type: new GraphQLList(characterLiteType),
      resolve: () => {
        return data;
      }
    }
  }
});

// server config
var schema = new graphql.GraphQLSchema({ query: queryType });

let app = express();
app.use(cors())
app.use('/graphql', graphqlHTTP({
  schema: schema,
  graphiql: true,
}));


app.listen(8080);
console.log('Running a GraphQL API server at http://localhost:8080/graphql');