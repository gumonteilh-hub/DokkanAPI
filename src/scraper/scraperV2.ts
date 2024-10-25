import axios, { AxiosError } from "axios";
import { existsSync, mkdirSync } from "fs";
import { writeFile } from "fs/promises";
import { resolve } from "path";
import { Rarities, Classes, Types, ImageLink, Card, Category } from "../model";
import { parseLeaders } from "../utils";
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

export async function saveDokkanResultsV2(): Promise<IScrapedCard[]> {
  console.log("Starting UR");
  const URData = await getDokkanData("UR");
  console.log("Starting LR");
  const LRData = await getDokkanData("LR");
  console.log("Finished scrape, saving data");
  const data = LRData.concat(URData);
  saveData("DokkanCharacterData", data);
  return data;
}

function saveData(fileName: string, data: unknown) {
  if (!existsSync(resolve(__dirname, "..", "..", "data"))) {
    mkdirSync("data");
  }
  writeFile(resolve(__dirname, "..", "..", `data/${fileName}.json`), JSON.stringify(data), { encoding: "utf8" });
}

async function getDokkanData(rarity: string) {
  let url = "https://dbz-dokkanbattle.fandom.com/wiki/Category:" + rarity;
  let links: string[] = [];

  console.log("indexing pages");

  while (true) {
    const document: Document = await fetchFromWeb(url);
    links = [...links, ...extractLinks(document)];
    const nextButtons = document.getElementsByClassName("category-page__pagination-next");
    if (nextButtons.length > 0) {
      url = (nextButtons[0] as HTMLAnchorElement).href;
    } else {
      break;
    }
  }

  const charactersData = await Promise.all(
    links.map(async (link) => {
      const ezaLink = link + "#Extreme_Z-Awakened";
      const characterDocument: Document = await fetchFromWeb(ezaLink);
      const scraped = extractCharacterData(characterDocument);
      return scraped;
    })
  );

  return charactersData;
}

export function mapToCard(character: IScrapedCard): Card {
  return {
    id: character.id,
    name: character.name,
    rarity: character.rarity,
    class: character.class,
    type: character.type,
    imageURL: character.imageURL,
    leaderSkill: character.leaderSkill,
    technicalLeaderSkill: parseLeaders(character.leaderSkill),
    categories: new Set(character.categories),
  };
}

function extractLinks(document: Document): string[] {
  const URIs: HTMLAnchorElement[] = Array.from(document.querySelectorAll(".category-page__member-link"));
  return URIs.map((link) => "https://dbz-dokkanbattle.fandom.com".concat(link.href));
}

function fetchPage(url: string): Promise<string | undefined> {
  const HTMLData = axios
    .get(url)
    .then((res) => res.data)
    .catch((error: AxiosError) => {
      console.error("error on url : " + url);
      console.error(error.status);
    });
  return HTMLData;
}

async function fetchFromWeb(url: string) {
  const HTMLData = await fetchPage(url);
  const dom = new JSDOM(HTMLData);
  return dom.window.document;
}

export interface IScrapedCard {
  id: string;
  name: string;
  rarity: string;
  class: string;
  type: string;
  imageURL: ImageLink;
  leaderSkill: string;
  categories: string[];
}

function extractCharacterData(characterDocument: Document): IScrapedCard {
  const characterData: IScrapedCard = {
    name: characterDocument.querySelector(".mw-parser-output")?.querySelector("table > tbody > tr > td:nth-child(2)")?.innerHTML.split("<br>")[1].split("</b>")[0].replaceAll("&amp;", "&") ?? "Error",
    rarity:
      Rarities[
        (characterDocument
          .querySelector(".mw-parser-output")
          ?.querySelector("table > tbody > tr:nth-child(3) > td:nth-child(3) > center")
          ?.querySelector("a")
          ?.getAttribute("title")
          ?.split("Category:")[1] as keyof typeof Rarities) ?? "unsuported"
      ],
    class:
      Classes[
        (characterDocument
          .querySelector(".mw-parser-output")
          ?.querySelector("table > tbody > tr:nth-child(3) > td:nth-child(4) > center:nth-child(1) > a:nth-child(1)")
          ?.getAttribute("title")
          ?.split(" ")[0]
          .split("Category:")[1] as keyof typeof Classes) ?? "Error"
      ],
    type: Types[
      (characterDocument
        .querySelector(".mw-parser-output")
        ?.querySelector("table > tbody > tr:nth-child(3) > td:nth-child(4) > center:nth-child(1) > a:nth-child(1)")
        ?.getAttribute("title")
        ?.split(" ")[1] as keyof typeof Types) ?? "Error"
    ],
    id: characterDocument.querySelector(".mw-parser-output")?.querySelector("table > tbody > tr:nth-child(3) > td:nth-child(6) > center:nth-child(1)")?.textContent ?? "Error",
    imageURL: getImageUrl(characterDocument),
    leaderSkill:
      characterDocument.querySelector('[data-image-name="Leader Skill.png"]')?.closest("tr")?.nextElementSibling?.textContent ??
      characterDocument.querySelector(".ezatabber > div > div:nth-child(3) > table > tbody > tr:nth-child(2) > td")?.textContent ??
      "error",
    categories: Array.from(characterDocument.querySelector('[data-image-name="Category.png"]')?.closest("tr")?.nextElementSibling?.querySelectorAll("a") ?? []).map(
      (link) => link.textContent ?? "Error"
    ),
  };
  return characterData;
}

function getImageUrl(characterDocument: Document): ImageLink {
  const baseDocument = characterDocument.querySelector(".mw-parser-output")?.getElementsByTagName("table")[0];
  if (baseDocument == undefined) {
    return { simpleUrl: "error" };
  }
  const simpleUrl =
    baseDocument?.querySelector("tbody > tr > td > div > img")?.getAttribute("src") ??
    baseDocument?.querySelector("tbody > tr > td > a")?.getAttribute("href") ??
    baseDocument?.querySelector("tbody > tr > td > img")?.getAttribute("src");
  if (simpleUrl) {
    return { simpleUrl: sanitizeImgUrl(simpleUrl) };
  }

  try {
    const imageContainer = baseDocument.querySelector("tbody > tr > td > div")?.children;
    if (imageContainer == undefined) {
      return { complexeUrl: "error" };
    }
    const complexeUrl = (imageContainer[3].firstChild as HTMLAnchorElement).href;
    return { complexeUrl: sanitizeImgUrl(complexeUrl) };
  } catch {
    return { complexeUrl: "error" };
  }
}

const sanitizeImgUrl = (url?: string): string => {
  if (url) {
    return url.split(".png")[0] + ".png";
  } else {
    return "error";
  }
};
