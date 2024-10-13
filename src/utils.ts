import { Card, Category, Character, Lead, LeaderRecap } from "./model";

export function isInCategories(card: Card, categories: string[]) {
    // character needs to be in every category given
    return categories.every(requiredCategorie => {
        // only one category needs to match the search category
        return card.categories.has(requiredCategorie)
    });
}

export function cleanData(Brutdata: Character[]): Card[] {
    const liteData: Card[] = Brutdata.map(character => (mapToCard(character)));

    const sortedData = liteData.sort((a, b) => parseInt(b.id) - parseInt(a.id))
    const filteredData = sortedData.filter((card, index) => {
        const evolvedId = (parseInt(card.id) + 1);
        for (const character of sortedData) {
            const charId = parseInt(character.id)
            if (charId === evolvedId) {
                return false
            }
            if (charId < evolvedId)
                return true;
        }
        return true
    })

    return filteredData;
}

function mapToCard(character: Character): Card {
    return {
        id: character.id,
        name: character.name,
        rarity: character.rarity,
        class: character.class,
        type: character.type,
        imageURL: character.imageURL,
        leaderSkill: character.ezaActiveSkill ?? character.leaderSkill,
        technicalLeaderSkill: parseLeaders(character.ezaActiveSkill ?? character.leaderSkill),
        categories: new Set(character.categories)
    }
}

function parseLeaders(leaderAsString: string): LeaderRecap {
    // Regex pour capturer le leader principal (avant "plus an additional")
    const mainLeaderRegex = /"(.*?)"(?:, "(.*?)")?(?: or "(.*?)")? Category Ki \+(\d+) and HP, ATK & DEF \+(\d+)%/;
    // Regex pour capturer le leader secondaire (après "plus an additional")
    const secondaryLeaderRegex = /plus an additional HP, ATK & DEF \+(\d+)% for characters who also belong to the "(.*?)"(?:, "(.*?)")?(?: or "(.*?)")? Category/;
    // Regex pour capturer la catégorie "Super Class"
    // const superClassRegex = /Super Class Ki \+(\d+) and HP, ATK & DEF \+(\d+)%/;
    // const extremeClassRegex = /Extreme Class Ki \+(\d+) and HP, ATK & DEF \+(\d+)%/;

    // Recherche du leader principal
    const mainLeaderMatch = mainLeaderRegex.exec(leaderAsString);
    const secondaryLeaderMatch = secondaryLeaderRegex.exec(leaderAsString);

    let mainLeaders: Lead[] = [];
    let secondaryLeaders: Lead[] = [];
    // let alternativeLeaders: Lead[] = [];

    // Si un leader principal a été trouvé, on associe chaque catégorie avec son pourcentage
    if (mainLeaderMatch) {
        const ki = mainLeaderMatch[4];
        const percentage = mainLeaderMatch[5];
        mainLeaders = mainLeaderMatch.slice(1, 4).filter(Boolean).map(category => ({
            category: parseCategory(category),
            ki: parseInt(ki),
            percentage: parseInt(percentage)
        }));
    }

    // Si un leader secondaire a été trouvé, on associe chaque catégorie avec son pourcentage (ici toujours 30%)
    if (secondaryLeaderMatch) {
        const percentage = secondaryLeaderMatch[1];
        secondaryLeaders = secondaryLeaderMatch.slice(2, 5).filter(Boolean).map(category => ({
            category: parseCategory(category),
            percentage: parseInt(percentage)
        }));
    }

    // Si un Super Class leader a été trouvé, on l'ajoute en tant que leader alternatif
    // if (superClassMatch) {
    //     const ki = superClassMatch[1];
    //     const percentage = superClassMatch[2];
    //     alternativeLeaders.push({
    //         category: parseCategory("Super Class"),
    //         ki: parseInt(ki),
    //         percentage: parseInt(percentage)
    //     });
    // }

    return {
        mainLeaders: mainLeaders,
        secondaryLeaders: secondaryLeaders,
        // alternativeLeaders: alternativeLeaders
    };
}

function parseCategory(categoryName: string): Category {
    const categoryKey = Object.keys(Category).find(
        key => Category[key as keyof typeof Category] === categoryName
    );
    if (categoryKey) {
        return Category[categoryKey as keyof typeof Category];
    } else {
        return Category.Unsuported;
    }

}