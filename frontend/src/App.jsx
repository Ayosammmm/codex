import { createBrowserRouter } from 'react-router';
import AppRoot from '@/pages/AppRoot';
import HomePage from '@/pages/HomePage';
import CreateUniversePage from '@/pages/CreateUniversePage';
import UniverseLayout from '@/pages/UniverseLayout';
import UniverseHomePage from '@/pages/UniverseHomePage';
import UniverseSettingsPage from '@/pages/UniverseSettingsPage';
import UniverseSectionPage from '@/pages/UniverseSectionPage';
import CharactersPage from '@/pages/characters/CharactersPage';
import CharacterPage from '@/pages/characters/CharacterPage';
import CharacterEditPage from '@/pages/characters/CharacterEditPage';
import PlacesPage from '@/pages/places/PlacesPage';
import ReferencePage from '@/pages/references/ReferencePage';
import { REFERENCES } from '@/config/modules';
import PlacePage from '@/pages/places/PlacePage';
import PlaceEditPage from '@/pages/places/PlaceEditPage';
import DynamicsPage from '@/pages/relations/DynamicsPage';
import StoriesPage from '@/pages/stories/StoriesPage';
import StoryPage from '@/pages/stories/StoryPage';
import StoryEditPage from '@/pages/stories/StoryEditPage';
import EpisodePage from '@/pages/stories/EpisodePage';
import EpisodeEditPage from '@/pages/stories/EpisodeEditPage';
import EventsPage from '@/pages/events/EventsPage';
import EventPage from '@/pages/events/EventPage';
import EventEditPage from '@/pages/events/EventEditPage';
import CreaturesPage from '@/pages/creatures/CreaturesPage';
import CreaturePage from '@/pages/creatures/CreaturePage';
import CreatureEditPage from '@/pages/creatures/CreatureEditPage';
import SpeciesPage from '@/pages/species/SpeciesPage';
import SpeciePage from '@/pages/species/SpeciePage';
import SpecieEditPage from '@/pages/species/SpecieEditPage';
import GroupsPage from '@/pages/groups/GroupsPage';
import GroupPage from '@/pages/groups/GroupPage';
import GroupEditPage from '@/pages/groups/GroupEditPage';
import { ModuleGate } from '@/pages/ModuleGate';
import NotFoundPage from '@/pages/NotFoundPage';
import LoginPage from '@/pages/LoginPage';
import UsersPage from '@/pages/users/UsersPage';
import RoleplayPage from '@/pages/roleplay/RoleplayPage';
import PlaceRoleplayPage from '@/pages/roleplay/PlaceRoleplayPage';
import RpScenePage from '@/pages/roleplay/RpScenePage';
import RpScenesPage from '@/pages/roleplay/RpScenesPage';
import RpSceneEditPage from '@/pages/roleplay/RpSceneEditPage';
import SoundsPage from '@/pages/sound/SoundsPage';
import { AdminOnly, RequireAuth, SuperAdminOnly } from '@/auth/RequireAuth';
import ModsAdminPage from '@/mods/ModsAdminPage';
import ModsDocsPage from '@/mods/ModsDocsPage';
import { CustomEntityEditPage, CustomEntityPage, ModSectionPage } from '@/mods/CustomEntityPages';

export const router = createBrowserRouter([{ element: <AppRoot />, children: [
  { path: '/connexion', element: <LoginPage /> },
  {
    // Tout le reste demande une connexion
    element: <RequireAuth />,
    children: [
  { path: '/', element: <HomePage /> },
  { path: '/utilisateurs', element: <AdminOnly><UsersPage /></AdminOnly> },
  { path: '/nouvel-univers', element: <AdminOnly><CreateUniversePage /></AdminOnly> },
  { path: '/mods', element: <SuperAdminOnly><ModsAdminPage /></SuperAdminOnly> },
  { path: '/mods/documentation', element: <SuperAdminOnly><ModsDocsPage /></SuperAdminOnly> },
  {
    // :universeRef = « 12-nom-de-l-univers » (l'id fait foi)
    path: '/univers/:universeRef',
    element: <UniverseLayout />,
    children: [
      { index: true, element: <UniverseHomePage /> },
      { path: 'parametres', element: <AdminOnly><UniverseSettingsPage /></AdminOnly> },
      { path: 'personnages', element: <CharactersPage /> },
      { path: 'personnages/nouveau', element: <CharacterEditPage /> },
      { path: 'personnages/:characterId', element: <CharacterPage /> },
      { path: 'personnages/:characterId/modifier', element: <CharacterEditPage /> },
      // Référentiels : /genres, /statuts, /types-de-lieux...
      ...REFERENCES.map((r) => ({
        path: r.path,
        element: (
          <ModuleGate module={r.for}>
            <ReferencePage key={r.key} referenceKey={r.key} />
          </ModuleGate>
        ),
      })),
      { path: 'lieux', element: <PlacesPage /> },
      { path: 'lieux/nouveau', element: <PlaceEditPage /> },
      { path: 'lieux/:placeId', element: <PlacePage /> },
      { path: 'lieux/:placeId/modifier', element: <PlaceEditPage /> },
      { path: 'dynamiques', element: <ModuleGate module="relations"><DynamicsPage /></ModuleGate> },
      { path: 'histoires', element: <ModuleGate module="stories"><StoriesPage /></ModuleGate> },
      { path: 'histoires/nouveau', element: <ModuleGate module="stories"><StoryEditPage /></ModuleGate> },
      { path: 'histoires/:storyId', element: <ModuleGate module="stories"><StoryPage /></ModuleGate> },
      { path: 'histoires/:storyId/modifier', element: <ModuleGate module="stories"><StoryEditPage /></ModuleGate> },
      { path: 'histoires/:storyId/episodes/nouveau', element: <ModuleGate module="stories"><EpisodeEditPage /></ModuleGate> },
      { path: 'histoires/:storyId/episodes/:episodeId', element: <ModuleGate module="stories"><EpisodePage /></ModuleGate> },
      { path: 'histoires/:storyId/episodes/:episodeId/modifier', element: <ModuleGate module="stories"><EpisodeEditPage /></ModuleGate> },
      { path: 'evenements', element: <ModuleGate module="events"><EventsPage /></ModuleGate> },
      { path: 'evenements/nouveau', element: <ModuleGate module="events"><EventEditPage /></ModuleGate> },
      { path: 'evenements/:eventId', element: <ModuleGate module="events"><EventPage /></ModuleGate> },
      { path: 'evenements/:eventId/modifier', element: <ModuleGate module="events"><EventEditPage /></ModuleGate> },
      { path: 'bestiaire', element: <ModuleGate module="creatures"><CreaturesPage /></ModuleGate> },
      { path: 'bestiaire/nouveau', element: <ModuleGate module="creatures"><CreatureEditPage /></ModuleGate> },
      { path: 'bestiaire/:creatureId', element: <ModuleGate module="creatures"><CreaturePage /></ModuleGate> },
      { path: 'bestiaire/:creatureId/modifier', element: <ModuleGate module="creatures"><CreatureEditPage /></ModuleGate> },
      { path: 'especes', element: <ModuleGate module="species"><SpeciesPage /></ModuleGate> },
      { path: 'especes/nouveau', element: <ModuleGate module="species"><SpecieEditPage /></ModuleGate> },
      { path: 'especes/:specieId', element: <ModuleGate module="species"><SpeciePage /></ModuleGate> },
      { path: 'especes/:specieId/modifier', element: <ModuleGate module="species"><SpecieEditPage /></ModuleGate> },
      { path: 'groupes', element: <ModuleGate module="groups"><GroupsPage /></ModuleGate> },
      { path: 'groupes/nouveau', element: <ModuleGate module="groups"><GroupEditPage /></ModuleGate> },
      { path: 'groupes/:groupId', element: <ModuleGate module="groups"><GroupPage /></ModuleGate> },
      { path: 'groupes/:groupId/modifier', element: <ModuleGate module="groups"><GroupEditPage /></ModuleGate> },
      { path: 'roleplay', element: <ModuleGate module="roleplay"><RoleplayPage /></ModuleGate> },
      { path: 'roleplay/lieux/:placeId', element: <ModuleGate module="roleplay"><PlaceRoleplayPage /></ModuleGate> },
      { path: 'roleplay/scenes', element: <ModuleGate module="roleplay"><RpScenesPage /></ModuleGate> },
      { path: 'roleplay/scenes/:sceneId/modifier', element: <ModuleGate module="roleplay"><RpSceneEditPage /></ModuleGate> },
      { path: 'roleplay/scenes/:sceneId', element: <ModuleGate module="roleplay"><RpScenePage /></ModuleGate> },
      { path: 'sons', element: <ModuleGate module="sound"><SoundsPage /></ModuleGate> },
      // Mods : types d'entités et pages de code (voir src/mods)
      { path: 'mods/:modId/:modPath', element: <ModSectionPage /> },
      { path: 'mods/:modId/:modPath/nouveau', element: <CustomEntityEditPage /> },
      { path: 'mods/:modId/:modPath/:entityId', element: <CustomEntityPage /> },
      { path: 'mods/:modId/:modPath/:entityId/modifier', element: <CustomEntityEditPage /> },
      // Modules et référentiels : /personnages, /lieux, /genres... (voir src/config/modules.js)
      { path: ':section', element: <UniverseSectionPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
    ],
  },
]}]);
