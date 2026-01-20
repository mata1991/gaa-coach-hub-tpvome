import { db } from '../index.js';
import * as schema from './schema.js';
import type { InferInsertModel } from 'drizzle-orm';

// Admin user ID (this would normally come from auth)
const ADMIN_USER_ID = 'admin-user-001';

async function seed() {
  console.log('🌱 Starting seed...');

  try {
    // Create a club
    const [club] = await db
      .insert(schema.clubs)
      .values({
        name: 'Kilcormac GAA Club',
        createdBy: ADMIN_USER_ID,
      })
      .returning();
    console.log('✅ Created club:', club.name);

    // Create teams
    const [hurlingTeam] = await db
      .insert(schema.teams)
      .values({
        clubId: club.id,
        name: 'Senior Hurling',
        ageGrade: 'Senior',
        level: 'Senior A',
      })
      .returning();
    console.log('✅ Created team:', hurlingTeam.name);

    const [camogiTeam] = await db
      .insert(schema.teams)
      .values({
        clubId: club.id,
        name: 'Camogie',
        ageGrade: 'Senior',
        level: 'Senior A',
      })
      .returning();
    console.log('✅ Created team:', camogiTeam.name);

    // Create a season
    const [season] = await db
      .insert(schema.seasons)
      .values({
        clubId: club.id,
        name: '2024 Summer Season',
        startDate: '2024-05-01',
        endDate: '2024-11-30',
        isActive: true,
      })
      .returning();
    console.log('✅ Created season:', season.name);

    // Create competitions
    const [leagueCompetition] = await db
      .insert(schema.competitions)
      .values({
        seasonId: season.id,
        name: 'Leinster Club Hurling League',
        type: 'League',
      })
      .returning();
    console.log('✅ Created competition:', leagueCompetition.name);

    const [champCompetition] = await db
      .insert(schema.competitions)
      .values({
        seasonId: season.id,
        name: 'Leinster Club Hurling Championship',
        type: 'Championship',
      })
      .returning();
    console.log('✅ Created competition:', champCompetition.name);

    // Create 30 players for hurling team
    const playerNames = [
      'Sean Murphy',
      'Padraig Kelly',
      'Thomas O\'Brien',
      'Darragh Walsh',
      'Michael Doyle',
      'John Collins',
      'Peter Joyce',
      'David Ryan',
      'Mark Brennan',
      'Kevin Hogan',
      'Liam McCarthy',
      'Dermot Kennedy',
      'Conor Phelan',
      'Aidan Martin',
      'Cormac Nolan',
      'Shane Bracken',
      'Richie Hogan',
      'TJ Reid',
      'Billy Ryan',
      'Mikey Carey',
      'Jack Shorten',
      'Adrian Mullen',
      'Eoin Murphy',
      'Gearoid Healy',
      'Cathal Dunbar',
      'Seamus Morris',
      'Paul Morris',
      'Joey Holden',
      'Brendan Maher',
      'Dan Sheffrey',
    ];

    const players: Array<InferInsertModel<typeof schema.players>> = playerNames.map(
      (name, idx) => ({
        teamId: hurlingTeam.id,
        name,
        jerseyNo: idx + 1,
        positions: idx % 3 === 0 ? 'Goalkeeper' : idx % 3 === 1 ? 'Midfield' : 'Forward',
        dominantSide: idx % 2 === 0 ? 'right' : 'left',
        notes: `Player #${idx + 1}`,
      })
    );

    const createdPlayers = await db.insert(schema.players).values(players).returning();
    console.log(`✅ Created ${createdPlayers.length} players`);

    // Create 6 fixtures
    const opponents = [
      'Ballyscanlan',
      'Gowran',
      'Waterford Wanderers',
      'Tullaroan',
      'Graigue-Ballycaden',
      'Bennettsbridge',
    ];

    const fixtureValues: Array<InferInsertModel<typeof schema.fixtures>> = opponents.map(
      (opponent, idx) => ({
        teamId: hurlingTeam.id,
        competitionId: idx < 3 ? leagueCompetition.id : champCompetition.id,
        opponent,
        venue: idx % 2 === 0 ? 'Kilcormac GAA Grounds' : opponent + ' Grounds',
        date: new Date(2024, 5 + Math.floor(idx / 2), 10 + idx * 7),
        status: idx < 2 ? 'completed' : idx === 2 ? 'in_progress' : 'scheduled',
      })
    );

    const fixtures = await db.insert(schema.fixtures).values(fixtureValues).returning();
    console.log(`✅ Created ${fixtures.length} fixtures`);

    // Create training sessions
    const trainingDates = [
      new Date(2024, 4, 15),
      new Date(2024, 4, 18),
      new Date(2024, 4, 22),
      new Date(2024, 4, 25),
    ];

    const trainingValues = trainingDates.map((date) => ({
      teamId: hurlingTeam.id,
      date,
      focus: 'Ball handling and passing drills',
      drills: 'Solo runs, Ground catches, Passing accuracy',
      notes: 'General fitness training',
    }));

    const trainingSessions = await db
      .insert(schema.trainingSessions)
      .values(trainingValues)
      .returning();
    console.log(`✅ Created ${trainingSessions.length} training sessions`);

    // Create attendance records
    const attendanceValues = [];
    for (const session of trainingSessions) {
      for (let i = 0; i < createdPlayers.length; i++) {
        if (Math.random() > 0.2) {
          // 80% attendance
          attendanceValues.push({
            playerId: createdPlayers[i].id,
            sessionId: session.id,
            status: Math.random() > 0.95 ? 'late' : 'present',
            notes: Math.random() > 0.9 ? 'Left early' : null,
          });
        }
      }
    }

    if (attendanceValues.length > 0) {
      await db.insert(schema.attendance).values(attendanceValues);
      console.log(`✅ Created ${attendanceValues.length} attendance records`);
    }

    // Create match events for the completed fixtures
    const eventCategories = ['Scoring', 'Puckouts', 'Possession', 'Discipline'];
    const scoringEvents = ['Goal', 'Point', 'Wide', 'Free Converted'];
    const puckoutEvents = ['Won Clean', 'Broken Won', 'Lost'];
    const possessionEvents = ['Turnover Won', 'Turnover Lost', 'Hook', 'Block'];
    const zones = ['Left', 'Centre', 'Right', 'Deep'];

    for (const fixture of fixtures.slice(0, 2)) {
      // Only for completed fixtures
      const eventCount = 50 + Math.random() * 50; // 50-100 events

      for (let i = 0; i < eventCount; i++) {
        const timestamp = Math.floor(Math.random() * 2520); // 42 minutes in seconds
        const categoryIdx = Math.floor(Math.random() * eventCategories.length);
        const category = eventCategories[categoryIdx] as
          | 'Scoring'
          | 'Puckouts'
          | 'Possession'
          | 'Discipline';

        let eventType = '';
        if (category === 'Scoring') {
          eventType = scoringEvents[Math.floor(Math.random() * scoringEvents.length)];
        } else if (category === 'Puckouts') {
          eventType = puckoutEvents[Math.floor(Math.random() * puckoutEvents.length)];
        } else if (category === 'Possession') {
          eventType = possessionEvents[Math.floor(Math.random() * possessionEvents.length)];
        } else {
          eventType = 'Yellow';
        }

        const randomPlayer =
          Math.random() > 0.3 ? createdPlayers[Math.floor(Math.random() * createdPlayers.length)].id : null;

        await db.insert(schema.matchEvents).values({
          fixtureId: fixture.id,
          playerId: randomPlayer,
          timestamp,
          eventType,
          eventCategory: category,
          outcome:
            category === 'Puckouts'
              ? ['Short', 'Long'][Math.floor(Math.random() * 2)]
              : undefined,
          zone: ['Scoring', 'Puckouts'].includes(category)
            ? zones[Math.floor(Math.random() * zones.length)]
            : undefined,
          notes: Math.random() > 0.9 ? 'Notable play' : undefined,
          clientId: `event-${fixture.id}-${i}`,
          synced: true,
        });
      }
    }
    console.log('✅ Created match events for completed fixtures');

    // Create lineups for fixtures
    for (const fixture of fixtures) {
      const starting15 = createdPlayers.slice(0, 15).map((p, idx) => ({
        playerId: p.id,
        position:
          idx < 3
            ? 'Goalkeeper'
            : idx < 8
              ? 'Defender'
              : idx < 12
                ? 'Midfielder'
                : 'Forward',
      }));

      const subs = createdPlayers.slice(15, 20).map((p, idx) => ({
        playerId: p.id,
        order: idx + 1,
      }));

      const minutesTargets: Record<string, number> = {};
      createdPlayers.forEach((p) => {
        minutesTargets[p.id] = 40 + Math.random() * 30; // 40-70 minutes
      });

      await db.insert(schema.lineups).values({
        fixtureId: fixture.id,
        name: 'Starting Lineup',
        starting15: starting15 as any,
        subs: subs as any,
        minutesTargets: minutesTargets as any,
      });
    }
    console.log(`✅ Created lineups for ${fixtures.length} fixtures`);

    // Create development notes
    for (const player of createdPlayers.slice(0, 10)) {
      await db.insert(schema.developmentNotes).values({
        playerId: player.id,
        strengths: 'Strong ball control, good vision',
        targets: 'Improve first touch accuracy, increase intensity',
        coachNotes: 'Progressing well, needs more game time',
        createdBy: ADMIN_USER_ID,
      });
    }
    console.log('✅ Created development notes');

    // Create fitness tests
    for (const player of createdPlayers.slice(0, 20)) {
      await db.insert(schema.fitnessTests).values({
        playerId: player.id,
        testType: 'Beep Test',
        date: '2024-05-01',
        value: (12 + Math.random() * 3).toString(),
        unit: 'Level',
      });
    }
    console.log('✅ Created fitness tests');

    // Create user roles
    await db.insert(schema.userRoles).values({
      userId: ADMIN_USER_ID,
      teamId: hurlingTeam.id,
      role: 'club_admin',
    });

    console.log('✅ Created user roles');

    console.log('\n🎉 Seed completed successfully!');
    console.log(`Club ID: ${club.id}`);
    console.log(`Hurling Team ID: ${hurlingTeam.id}`);
    console.log(`Camogie Team ID: ${camogiTeam.id}`);
    console.log(`Season ID: ${season.id}`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

// Run seed
seed().then(() => process.exit(0));
