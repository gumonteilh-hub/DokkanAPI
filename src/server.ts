const express = require("express");
const cors = require("cors");
const graphql = require("graphql");
const { ruruHTML } = require("ruru/server");
import { Card, Character } from "./model";
import { cleanData, isInCategories } from "./utils";
import { createHandler } from "graphql-http/lib/use/express";



// prepare data
const brutdata: Character[] = require("../data/DokkanCharacterData.json");
const data = cleanData(brutdata);

// data type
const imageType = new graphql.GraphQLObjectType({
  name: "Image",
  fields: {
    simpleUrl: { type: graphql.GraphQLString },
    complexeUrl: { type: graphql.GraphQLString },
  },
});

const CardType = new graphql.GraphQLObjectType({
  name: "Card",
  fields: {
    id: {
      type: new graphql.GraphQLNonNull(graphql.GraphQLString),
      description: "The id of the character",
    },
    name: { type: graphql.GraphQLString },
    rarity: { type: graphql.GraphQLString },
    class: { type: graphql.GraphQLString },
    type: { type: graphql.GraphQLString },
    imageURL: { type: imageType },
    leaderSkill: { type: graphql.GraphQLString },
    superAttack: { type: graphql.GraphQLString },
  },
});

const LeadedCards = new graphql.GraphQLObjectType({
  name: "LeadedCards",
  fields: {
    boostPercentage: { type: graphql.GraphQLInt! },
    cards: { type: new graphql.GraphQLList(CardType) },
  },
});

// query
const queryType = new graphql.GraphQLObjectType({
  name: "Query",
  fields: {
    characters: {
      type: new graphql.GraphQLList(CardType),
      args: {
        categories: { type: new graphql.GraphQLList(graphql.GraphQLString) },
        id: { type: graphql.GraphQLString },
      },
      resolve: (_notUsed: any, { categories = [], id }: { categories?: string[]; id?: string }) => {
        if (id) {
          return [data.find((card) => card.id === id)];
        }
    
        return data.filter((character) => isInCategories(character, categories));
      }
    },
    lastCharacters: {
      type: new graphql.GraphQLList(CardType),
      resolve: () => {
        return data.slice(0, 100);
      },
    },
    allCharacters: {
      type: new graphql.GraphQLList(CardType),
      resolve: () => {
        return data;
      },
    },
    charactersLeadBy: {
      type: new graphql.GraphQLList(LeadedCards),
      args: {
        id: { type: graphql.GraphQLString },
      },
      resolve: (_notUsed: any, { id }: { id: string }) => {
        const leader = data.find(
          (card) => card.id === id
        )?.technicalLeaderSkill;
        if (!leader?.mainLeaders) return [];

        let boostGroups: {
          [key: number]: Card[];
        } = {};

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
                break; // On suppose qu'il n'y a qu'un leader secondaire applicable
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

        const result = Object.entries(boostGroups)
          .map(([boostPercentage, cards]) => ({
            boostPercentage: parseInt(boostPercentage),
            cards,
          }))
          .sort((a, b) => b.boostPercentage - a.boostPercentage);

        return result;
      },
    },
  },
});

// server config
const schema = new graphql.GraphQLSchema({ query: queryType });

let app = express();
app.use(cors());
app.all(
  "/graphql",
  createHandler({
    schema: schema,
  })
);

app.get("/", (_req: any, res: any) => {
  res.type("html");
  res.end(ruruHTML({ endpoint: "/graphql" }));
});

app.listen(8080);
console.log("Running a GraphQL API server at http://localhost:8080/graphql");
