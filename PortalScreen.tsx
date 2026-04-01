import betaCard from 'path/to/betaCard';

const games = [
    // ...other games,
    {
        id: 'beta',
        name: 'בטטה',
        image: betaCard,
        route: '/beta',
        description: t('portal.betaDesc'),
        color: 'from-[hsl(45,93%,62%)] to-[hsl(25,95%,53%)]',
        players: '1-4',
    },
    // ... (keep the game that comes after Iron Dome)
];

// Update the emoji logic
const logoEmoji = {
    // ...other games,
    beta: '🎯',
};