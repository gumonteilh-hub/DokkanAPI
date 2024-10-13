import { Card, Character } from "./model";

export function isInCategories(card: Card, categories: string[]) {
    // character needs to be in every category given
    return categories.every(requiredCategorie => {
        // only one category needs to match the search category
        return card.categories.some(cardCategorie => {
            // may change this to be exact match rather than includes. Seems more flexible right now
            return requiredCategorie.toLowerCase().includes(cardCategorie.toLowerCase())
        })
    });
}

export function cleanData(Brutdata: Character[]): Card[] {
    const liteData: Card[] = Brutdata.map(character => (mapToCard(character)));

    const sortedData = liteData.sort((a, b) => parseInt(b.id) - parseInt(a.id))
    return sortedData.filter(char => {
        const evolvedId = (parseInt(char.id) + 1).toString();
        for (const character of sortedData) {
            if (character.id == evolvedId) {
                return false
            }
            if (character.id < evolvedId)
                return true;
        }
        return true
    })
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
        categories: character.categories
    }
}



