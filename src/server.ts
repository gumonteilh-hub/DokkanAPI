let express = require('express');
let cors = require('cors');
let { graphqlHTTP } = require('express-graphql');
var graphql = require('graphql');
import { GraphQLInt, GraphQLList, GraphQLString } from "graphql";
import { Card, Character } from "./model";
import { cleanData, isInCategories } from "./utils";

// prepare data 
const Brutdata: Character[] = require('../data/DokkanCharacterData.json')
const data = cleanData(Brutdata);

// data type
var imageType = new graphql.GraphQLObjectType({
  name: 'Image',
  fields: {
    simpleUrl: { type: GraphQLString },
    complexeUrl: { type: GraphQLString },
  }
})

var CardType = new graphql.GraphQLObjectType({
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
    superAttack: { type: GraphQLString },
  }
});

var LeadedCards = new graphql.GraphQLObjectType({
  name: 'LeadedCards',
  fields: {
    boostPercentage: { type: GraphQLInt! },
    cards: { type: GraphQLList(CardType) },
  }
})

// query
var queryType = new graphql.GraphQLObjectType({
  name: 'Query',
  fields: {
    characters: {
      type: new GraphQLList(CardType),
      args: {
        categories: { type: GraphQLList(GraphQLString) },
        id: { type: GraphQLString }
      },
      // @ts-ignore
      resolve: (_notUsed, { categories, id }) => {

        if (id) {
          return [data.find(card => card.id === id)]
        }

        return data.filter(character => isInCategories(character, categories))
      }
    },
    lastCharacters: {
      type: new GraphQLList(CardType),
      resolve: () => {
        return data.slice(0, 100);
      }
    },
    allCharacters: {
      type: new GraphQLList(CardType),
      resolve: () => {
        return data;
      }
    },
    charactersLeadBy: {
      type: new GraphQLList(LeadedCards),
      args: {
        id: { type: GraphQLString },
      },
      // @ts-ignore
      resolve: (_notUsed, { id }) => {
        const leader = data.find(card => card.id === id)?.technicalLeaderSkill;
        if (!leader?.mainLeaders) return [];

        let boostGroups: {
          [key: number]: Card[]
        } = {}

        // Parcourir toutes les cartes
        for (let card of data) {
          let mainLeaderBoost = null;
          let secondaryLeaderBoost = null;

          // Chercher le leader principal applicable à la carte
          for (let mainLeader of leader.mainLeaders) {
            if (card.categories.has(mainLeader.category)) {
              // Comparer pour garder le leader principal avec le plus haut pourcentage
              const currentBoost = mainLeader.percentage;
              if (!mainLeaderBoost || currentBoost > mainLeaderBoost) {
                mainLeaderBoost = currentBoost;
              }
            }
          }

          // Si un leader principal a été trouvé, chercher un leader secondaire applicable
          if (mainLeaderBoost !== null) {
            for (let secondaryLeader of leader.secondaryLeaders) {
              if (card.categories.has(secondaryLeader.category)) {
                secondaryLeaderBoost = secondaryLeader.percentage;
                break;  // On suppose qu'il n'y a qu'un leader secondaire applicable
              }
            }

            // Calcul du pourcentage total de boost
            let totalBoost = mainLeaderBoost;
            if (secondaryLeaderBoost) {
              totalBoost += secondaryLeaderBoost;
            }

            // Ajouter la carte avec son boost
            // Regrouper les cartes par pourcentage
            if (!boostGroups[totalBoost]) {
              boostGroups[totalBoost] = [];
            }
            boostGroups[totalBoost].push(card);
          }
        }

        const result = Object.entries(boostGroups).map(([boostPercentage, cards]) => ({
          boostPercentage : parseInt(boostPercentage),
          cards
        })).sort((a,b) => (b.boostPercentage - a.boostPercentage));

        return result;
      }

    },
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