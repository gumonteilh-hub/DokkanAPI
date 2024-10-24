import axios, { AxiosError } from 'axios';
import { existsSync, mkdirSync } from "fs";
import { writeFile } from "fs/promises";
import { resolve } from "path";
import { Transformation, Character, Rarities, Classes, Types, ImageLink } from '../model';
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

export async function saveDokkanResults() {
    console.log('Starting UR');
    const URData = await getDokkanData('UR');
    console.log('Starting LR');
    const LRData = await getDokkanData('LR');
    console.log('Finished scrape, saving data');
    const data = LRData.concat(URData);
    saveData('DokkanCharacterData', data)
}

function saveData(fileName: string, data: unknown) {
    if (!existsSync(resolve(__dirname , '..', '..', 'data'))) {
        mkdirSync('data');
    }
    writeFile(
        resolve(__dirname, '..', '..', `data/${fileName}.json`),
        JSON.stringify(data),
        { encoding: 'utf8' })
}

async function getDokkanData(rarity: string) {

    let url = 'https://dbz-dokkanbattle.fandom.com/wiki/Category:' + rarity;
    let links: string[] = [];

    console.log("indexing pages");

    while (true) {
        const document: Document = await fetchFromWeb(url);
        links = [...links, ...extractLinks(document)];
        const nextButtons = document.getElementsByClassName("category-page__pagination-next");
        if (nextButtons.length > 0) {
            url = (nextButtons[0] as HTMLAnchorElement).href;
            console.log("page done")
        } else {
            break;
        }
    }

    console.log("indexing pages is over");


    const charactersData = await Promise.all(links.map(async link => {
        const ezaLink = link + "#Extreme_Z-Awakened"
        console.log(ezaLink)
        const characterDocument: Document = await fetchFromWeb(link)
        return extractCharacterData(characterDocument)
    }))

    return charactersData
}

function fetchPage(url: string): Promise<string | undefined> {
    const HTMLData = axios.get(url)
        .then(res => res.data)
        .catch((error: AxiosError) => {
            console.error('nope');
            console.error(error);
        });
    return HTMLData;
}

async function fetchFromWeb(url: string) {
    const HTMLData = await fetchPage(url);
    const dom = new JSDOM(HTMLData);
    return dom.window.document;

}

function extractLinks(document: Document): string[] {
    const URIs: HTMLAnchorElement[] = Array.from(
        document.querySelectorAll('.category-page__member-link'),
    );
    return URIs.map(link => 'https://dbz-dokkanbattle.fandom.com'.concat(link.href))
}

function extractCharacterData(characterDocument: Document) {
    const transformedCharacterData: Transformation[] = extractTransformedCharacterData(characterDocument);

    const characterData: Character = {
        name: characterDocument.querySelector('.mw-parser-output')?.querySelector('table > tbody > tr > td:nth-child(2)')?.innerHTML.split('<br>')[1].split('</b>')[0].replaceAll('&amp;', '&') ?? 'Error',
        title: characterDocument.querySelector('.mw-parser-output')?.querySelector('table > tbody > tr > td:nth-child(2)')?.innerHTML.split('<br>')[0].split('<b>')[1] ?? 'Error',
        maxLevel: parseInt((characterDocument.querySelector('.mw-parser-output')?.querySelector('table > tbody > tr:nth-child(3) > td')?.textContent?.split('/')[1] || characterDocument.querySelector('.mw-parser-output')?.querySelector('table > tbody > tr:nth-child(3) > td')?.textContent?.split('/')[0]) ?? 'Error'),
        maxSALevel: parseInt((characterDocument.querySelector('.mw-parser-output')?.querySelector('table > tbody > tr:nth-child(3) > td:nth-child(2) > center')?.innerHTML.split('>/')[1]) ?? ' Error'),
        rarity: Rarities[characterDocument.querySelector('.mw-parser-output')?.querySelector('table > tbody > tr:nth-child(3) > td:nth-child(3) > center')?.querySelector('a')?.getAttribute('title')?.split('Category:')[1] as keyof typeof Rarities ?? "unsuported"],
        class: Classes[characterDocument.querySelector('.mw-parser-output')?.querySelector('table > tbody > tr:nth-child(3) > td:nth-child(4) > center:nth-child(1) > a:nth-child(1)')?.getAttribute('title')?.split(' ')[0].split('Category:')[1] as keyof typeof Classes ?? 'Error'],
        type: Types[characterDocument.querySelector('.mw-parser-output')?.querySelector('table > tbody > tr:nth-child(3) > td:nth-child(4) > center:nth-child(1) > a:nth-child(1)')?.getAttribute('title')?.split(' ')[1] as keyof typeof Types ?? 'Error'],
        cost: parseInt((characterDocument.querySelector('.mw-parser-output')?.querySelector('table > tbody > tr:nth-child(3) > td:nth-child(5) > center:nth-child(1)')?.textContent) ?? 'Error'),
        id: characterDocument.querySelector('.mw-parser-output')?.querySelector('table > tbody > tr:nth-child(3) > td:nth-child(6) > center:nth-child(1)')?.textContent ?? 'Error',
        imageURL: getImageUrl(characterDocument),
        leaderSkill: characterDocument.querySelector('[data-image-name="Leader Skill.png"]')?.closest('tr')?.nextElementSibling?.textContent ?? 'Error',
        ezaLeaderSkill: characterDocument.querySelector('.ezatabber > div > div:nth-child(3) > table > tbody > tr:nth-child(2) > td')?.textContent ?? undefined,
        superAttack: characterDocument.querySelector('[data-image-name="Super atk.png"]')?.closest('tr')?.nextElementSibling?.textContent ?? 'Error',
        ezaSuperAttack: characterDocument.querySelectorAll('table.ezawidth')[1]?.querySelector('[data-image-name="Super atk.png"]')?.closest('tr')?.nextElementSibling?.textContent ?? undefined,
        ultraSuperAttack: characterDocument.querySelector('[data-image-name="Ultra Super atk.png"]')?.closest('tr')?.nextElementSibling?.textContent ?? undefined,
        ezaUltraSuperAttack: characterDocument.querySelectorAll('table.ezawidth')[1]?.querySelector('[data-image-name="Ultra Super atk.png"]')?.closest('tr')?.nextElementSibling?.textContent ?? undefined,
        passive: characterDocument.querySelector('[data-image-name="Passive skill.png"]')?.closest('tr')?.nextElementSibling?.textContent ?? 'Error',
        ezaPassive: characterDocument.querySelectorAll('table.ezawidth')[1]?.querySelector('[data-image-name="Passive skill.png"]')?.closest('tr')?.nextElementSibling?.textContent ?? undefined,
        activeSkill: (characterDocument.querySelector('[data-image-name="Active skill.png"]')?.closest('tr')?.nextElementSibling?.textContent || characterDocument.querySelector('[data-image-name="Active skill.png"]')?.closest('tr')?.nextElementSibling?.nextElementSibling?.textContent) ?? undefined,
        activeSkillCondition: characterDocument.querySelector('[data-image-name="Active skill.png"]')?.closest('tr')?.nextElementSibling?.nextElementSibling?.nextElementSibling?.querySelector('td > center')?.textContent ?? undefined,
        ezaActiveSkill: characterDocument.querySelectorAll('table.ezawidth')[1]?.querySelector('[data-image-name="Active skill.png"]')?.closest('tr')?.nextElementSibling?.textContent ?? undefined,
        ezaActiveSkillCondition: characterDocument.querySelectorAll('table.ezawidth')[1]?.querySelector('[data-image-name="Active skill.png"]')?.closest('tr')?.nextElementSibling?.nextElementSibling?.nextElementSibling?.querySelector('td > center')?.textContent ?? undefined,
        transformationCondition: characterDocument.querySelector('[data-image-name="Transformation Condition.png"]')?.closest('tr')?.nextElementSibling?.querySelector('td > center')?.textContent ?? undefined,
        links: Array.from(characterDocument.querySelector('[data-image-name="Link skill.png"]')?.closest('tr')?.nextElementSibling?.querySelectorAll('span > a') ?? []).map(link => link.textContent ?? 'Error'),
        categories: Array.from(characterDocument.querySelector('[data-image-name="Category.png"]')?.closest('tr')?.nextElementSibling?.querySelectorAll('a') ?? []).map(link => link.textContent ?? 'Error'),
        kiMeter: Array.from(characterDocument.querySelector('[data-image-name="Ki meter.png"]')?.closest('tbody')?.querySelectorAll('img') ?? []).map(kiMeter => kiMeter.getAttribute('alt')?.split('.png')[0] ?? 'Error').slice(1),
        baseHP: parseInt(characterDocument.querySelector('.righttablecard > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2) > center:nth-child(1)')?.textContent ?? 'Error'),
        maxLevelHP: parseInt(characterDocument.querySelector('.righttablecard > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(3) > center:nth-child(1)')?.textContent ?? 'Error'),
        freeDupeHP: parseInt(characterDocument.querySelector('.righttablecard > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(4) > center:nth-child(1)')?.textContent ?? 'Error'),
        rainbowHP: parseInt(characterDocument.querySelector('.righttablecard > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(5) > center:nth-child(1)')?.textContent ?? 'Error'),
        baseAttack: parseInt(characterDocument.querySelector('.righttablecard > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(2) > center:nth-child(1)')?.textContent ?? 'Error'),
        maxLevelAttack: parseInt(characterDocument.querySelector('.righttablecard > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(3) > center:nth-child(1)')?.textContent ?? 'Error'),
        freeDupeAttack: parseInt(characterDocument.querySelector('.righttablecard > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(4) > center:nth-child(1)')?.textContent ?? 'Error'),
        rainbowAttack: parseInt(characterDocument.querySelector('.righttablecard > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(5) > center:nth-child(1)')?.textContent ?? 'Error'),
        baseDefence: parseInt(characterDocument.querySelector('.righttablecard > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(4) > td:nth-child(2) > center:nth-child(1)')?.textContent ?? 'Error'),
        maxDefence: parseInt(characterDocument.querySelector('.righttablecard > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(4) > td:nth-child(3) > center:nth-child(1)')?.textContent ?? 'Error'),
        freeDupeDefence: parseInt(characterDocument.querySelector('.righttablecard > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(4) > td:nth-child(4) > center:nth-child(1)')?.textContent ?? 'Error'),
        rainbowDefence: parseInt(characterDocument.querySelector('.righttablecard > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(4) > td:nth-child(5) > center:nth-child(1)')?.textContent ?? 'Error'),
        kiMultiplier: (characterDocument.querySelector('.righttablecard > table:nth-child(6) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(1)')?.innerHTML.split('► ')[1].split('<br>')[0].concat('; ', characterDocument.querySelector('.righttablecard > table:nth-child(6) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(1)')?.innerHTML.split('<br>► ')[1] ?? '').replace('<a href="/wiki/Super_Attack_Multipliers" title="Super Attack Multipliers">SA Multiplier</a>', 'SA Multiplier') ?? characterDocument.querySelector('.righttablecard')?.nextElementSibling?.querySelector('tr:nth-child(2) > td')?.textContent?.split('► ')[1]) ?? 'Error',
        transformations: transformedCharacterData
    }
    return characterData
}

function extractTransformedCharacterData(characterDocument: Document): Transformation[] {
    const transformedArray: Transformation[] = []
    const transformCount = characterDocument.querySelectorAll('.mw-parser-output > div:nth-child(2) > div > ul > li').length

    // index = 1 to skip the untransformed state which should have been extracted separately outside of this function
    for (let index = 1; index < transformCount; index++) {
        const transformationData: Transformation = {
            transformedName: characterDocument.querySelector(`.mw-parser-output > div:nth-child(2) > div:nth-child(${index + 2}) > table > tbody > tr > td:nth-child(2)`)?.innerHTML.split('<br>')[1].split('</b>')[0].replaceAll('&amp;', '&') ?? 'Error',
            transformedID: characterDocument.querySelector(`.mw-parser-output > div:nth-child(2) > div:nth-child(${index + 2}) > table > tbody > tr:nth-child(3) > td:nth-child(6)`)?.textContent ?? 'Error',
            transformedClass: Classes[characterDocument.querySelector(`.mw-parser-output > div:nth-child(2) > div:nth-child(${index + 2}) > table > tbody > tr:nth-child(3) > td:nth-child(4) > center > a`)?.getAttribute('title')?.split(' ')[0].split('Category:')[1] as keyof typeof Classes ?? "error"],
            transformedType: Types[characterDocument.querySelector(`.mw-parser-output > div:nth-child(2) > div:nth-child(${index + 2}) > table > tbody > tr:nth-child(3) > td:nth-child(4) > center > a`)?.getAttribute('title')?.split(' ')[1] as keyof typeof Types ?? 'Error'],
            transformedSuperAttack: characterDocument.querySelector(`.mw-parser-output > div:nth-child(2) > div:nth-child(${index + 2})`)?.querySelector('[data-image-name="Super atk.png"]')?.closest('tr')?.nextElementSibling?.textContent ?? 'Error',
            transformedEZASuperAttack: characterDocument.querySelector(`.mw-parser-output > div:nth-child(2) > div:nth-child(${index + 2})`)?.querySelector('.righttablecard > table > tbody > tr > td > div > div > div:nth-child(3)')?.querySelector('[data-image-name="Super atk.png"]')?.closest('tr')?.nextElementSibling?.textContent ?? undefined,
            transformedUltraSuperAttack: characterDocument.querySelector(`.mw-parser-output > div:nth-child(2) > div:nth-child(${index + 2})`)?.querySelector('[data-image-name="Ultra Super atk.png"]')?.closest('tr')?.nextElementSibling?.textContent ?? undefined,
            transformedEZAUltraSuperAttack: characterDocument.querySelector(`.mw-parser-output > div:nth-child(2) > div:nth-child(${index + 2})`)?.querySelector('.righttablecard > table > tbody > tr > td > div > div > div:nth-child(3)')?.querySelector('[data-image-name="Ultra Super atk.png"]')?.closest('tr')?.nextElementSibling?.textContent ?? undefined,
            transformedPassive: characterDocument.querySelector(`.mw-parser-output > div:nth-child(2) > div:nth-child(${index + 2})`)?.querySelector('[data-image-name="Passive skill.png"]')?.closest('tr')?.nextElementSibling?.textContent ?? 'Error',
            transformedEZAPassive: characterDocument.querySelector(`.mw-parser-output > div:nth-child(2) > div:nth-child(${index + 2})`)?.querySelector('.righttablecard > table > tbody > tr > td > div > div > div:nth-child(3)')?.querySelector('[data-image-name="Passive skill.png"]')?.closest('tr')?.nextElementSibling?.textContent ?? undefined,
            transformedActiveSkill: characterDocument.querySelector(`.mw-parser-output > div:nth-child(2) > div:nth-child(${index + 2})`)?.querySelector('[data-image-name="Active skill.png"]')?.closest('tr')?.nextElementSibling?.textContent ?? undefined,
            transformedActiveSkillCondition: characterDocument.querySelector(`.mw-parser-output > div:nth-child(2) > div:nth-child(${index + 2})`)?.querySelector('[data-image-name="Activation Condition.png"]')?.closest('tr')?.nextElementSibling?.textContent ?? undefined,
            transformedLinks: Array.from(characterDocument.querySelector(`.mw-parser-output > div:nth-child(2) > div:nth-child(${index + 2})`)?.querySelector('[data-image-name="Link skill.png"]')?.closest('tr')?.nextElementSibling?.querySelectorAll('span > a') ?? []).map(link => link.textContent ?? 'Error'),
            transformedImageURL: characterDocument.querySelector(`.mw-parser-output > div:nth-child(2) > div:nth-child(${index + 2}) > table > tbody > tr > td > div > img`)?.getAttribute('src') ?? characterDocument.querySelector(`.mw-parser-output > div:nth-child(2) > div:nth-child(${index + 2}) > table > tbody > tr > td > a`)?.getAttribute('href') ?? "error",
        }
        transformedArray.push(transformationData)
    }
    return transformedArray
}

function getImageUrl(characterDocument: Document): ImageLink {
        const baseDocument = characterDocument.querySelector('.mw-parser-output')?.getElementsByTagName('table')[0];
        if( baseDocument == undefined) {
            return {simpleUrl: "error"}
        }
        const simpleUrl = (baseDocument?.querySelector('tbody > tr > td > div > img')?.getAttribute('src') ?? baseDocument?.querySelector('tbody > tr > td > a')?.getAttribute('href')) ;

        if (simpleUrl) {
            return { simpleUrl : sanitizeImgUrl(simpleUrl) }
        }

    try {
        const imageContainer = baseDocument.querySelector('tbody > tr > td > div')?.children;
        if( imageContainer == undefined) {
            return {complexeUrl: "error"}
        }
        const complexeUrl = (imageContainer[3].firstChild as HTMLAnchorElement).href;
        return { complexeUrl : sanitizeImgUrl(complexeUrl) }
    } catch {
        return { complexeUrl : "error" }
    }
}

const sanitizeImgUrl = (url?: string): string => {
    if (url) {
        return url.split(".png")[0] + ".png"
    } else {
        return "error"
    }
}