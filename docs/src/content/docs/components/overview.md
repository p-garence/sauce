---
title: Catalogue des Composants UI
description: Répertoire exhaustif des composants réutilisables, leur rôle, leurs props et leur niveau de granularité.
---

Les composants sont organisés dans `src/lib/components/` selon des principes de modularité forte : composants de présentation purs, primitives UI réutilisables et sections composites.

Les composants de l'application sont modulaires et organisés par domaine métier dans `src/lib/components/` :

## 1. Primitives & Composants Communs (`ui/`, `navigation/`)
- [`Modal.svelte`](/wikidev/components/primitives/#1-modalsvelte) : Dialogue modal accessible avec fentes (snippets) et gestion Échap.
- [`SearchInput.svelte`](/wikidev/components/primitives/#2-searchinputsvelte) : Champ de recherche avec debounce, reset et indicateur de chargement.
- [`Icon.svelte`](/wikidev/components/primitives/#3-iconsvelte) : Rendu d'icônes vectorielles natives Lucide ou personnalisées.
- [`EmojiButton.svelte`](/wikidev/components/primitives/#4-emojibuttonsvelte--emojipickerpopoversvelte) & [`EmojiPickerPopover.svelte`](/wikidev/components/primitives/#4-emojibuttonsvelte--emojipickerpopoversvelte) : Sélecteur d'émojis standard et de packs personnalisés.
- [`VoiceMessagePlayer.svelte`](/wikidev/components/primitives/#5-voicemessageplayersvelte) : Lecteur audio avec waveform dynamique et scrubbing.
- [`VisibilitySelect.svelte`](/wikidev/components/primitives/#6-visibilityselectsvelte) : Sélecteur d'audience et de visibilité des publications/stories.
- [`NotificationMenu.svelte`](/wikidev/components/primitives/#7-notificationmenusvelte--notificationitemsvelte) & [`NotificationItem.svelte`](/wikidev/components/primitives/#7-notificationmenusvelte--notificationitemsvelte) : Menu déroulant des notifications en temps réel.

## 2. Écosystème Publications & Édition (`post/`, `post/editor/`)
- [`Post.svelte`](/wikidev/components/posts/#1-postsvelte) & [`PostHeader.svelte`](/wikidev/components/posts/#2-postheadersvelte) : Carte de publication orchestrant médias, texte, auteur et actions.
- [`PostCarousel.svelte`](/wikidev/components/posts/#3-postcarouselsvelte) : Carrousel interactif avec auto-play vidéo intelligent.
- [`CarouselSlideEditor.svelte`](/wikidev/components/posts/#4-carouselslideeditorsvelte) : Éditeur unifié pour slides texte et média.
- [`CarouselThumbnailsBar.svelte`](/wikidev/components/posts/#5-carouselthumbnailsbarsvelte) : Barre de vignettes et ajout rapide de diapositives.
- [`AssetPackPickerModal.svelte`](/wikidev/components/posts/#6-assetpackpickermodalsvelte) : Sélection d'un pack d'icônes ou d'émojis à lier au post.

## 3. Commentaires & Réactions (`comments/`)
- [`CommentSection.svelte`](/wikidev/components/comments/#1-commentsectionsvelte) : Volet dépliable avec pagination des commentaires.
- [`CommentBaseItem.svelte`](/wikidev/components/comments/#2-commentbaseitemsvelte) : Rendu factorisé d'un commentaire ou d'une réponse (actions, édition inline, likes, vocal).
- [`CommentComposer.svelte`](/wikidev/components/comments/#3-commentcomposersvelte) : Formulaire de saisie avec texte riche, émojis et enregistrement vocal.

## 4. Messagerie & Chat (`chat/`)
- [`ChatHeader.svelte`](/wikidev/components/chat/#1-chatheadersvelte) : En-tête de conversation directe ou de groupe avec statut en ligne.
- [`ChatMessageItem.svelte`](/wikidev/components/chat/#2-chatmessageitemsvelte) : Bulle de message (texte, vocal, image, statut de lecture et horodatage).
- [`ChatInputBar.svelte`](/wikidev/components/chat/#3-chatinputbarsvelte) : Barre de saisie multifonction avec upload et raccourcis.
- [`ChatAudioRecorder.svelte`](/wikidev/components/chat/#4-chataudiorecordersvelte) : Enregistreur vocal micro avec pré-écoute et annulation.
- [`ChatMessageRequestsBanner.svelte`](/wikidev/components/chat/#5-chatmessagerequestsbannersvelte) : Bandeau d'autorisation pour les messages entrants d'inconnus.

## 5. Stories & Médias (`stories/`, `media-editor/`)
- [`StoryViewerModal.svelte`](/wikidev/components/stories/#1-storyviewermodalsvelte) : Lecteur immersif plein écran (progression, gestes, réponses, likes).
- [`StoryProgressBar.svelte`](/wikidev/components/stories/#2-storyprogressbarsvelte) : Segments horizontaux de progression temporelle des stories.
- [`StoryCreator.svelte`](/wikidev/components/stories/#3-storycreatorsvelte) : Interface de composition de story.
- [`MediaEditorModal.svelte`](/wikidev/components/stories/#4-mediaeditormodalsvelte) : Retouche photo, filtres, dessin au trait et calques de texte.
- [`TextStyleControls.svelte`](/wikidev/components/stories/#5-textstylecontrolssvelte) : Barre d'outils de formatage typographique sur photo.

## 6. Paramètres (`settings/`)
- [`SettingsMedia.svelte`](/wikidev/components/settings/#1-settingsmediasvelte--storagequotacardsvelte) & [`StorageQuotaCard.svelte`](/wikidev/components/settings/#1-settingsmediasvelte--storagequotacardsvelte) : Gestion du quota disque et nettoyage ciblé des fichiers.
- [`SettingsFeeds.svelte`](/wikidev/components/settings/#2-settingsfeedssvelte--feedconfigformsvelte) & [`FeedConfigForm.svelte`](/wikidev/components/settings/#2-settingsfeedssvelte--feedconfigformsvelte) : Création et personnalisation de flux composites.
- [`SettingsEmojis.svelte`](/wikidev/components/settings/#3-settingsemojissvelte--settingsiconssvelte) & [`SettingsIcons.svelte`](/wikidev/components/settings/#3-settingsemojissvelte--settingsiconssvelte) : Gestion des packs et favoris.
- [`SettingsPrivacy.svelte`](/wikidev/components/settings/#4-settingsprivacysvelte--settingsgroupssvelte) & [`SettingsGroups.svelte`](/wikidev/components/settings/#4-settingsprivacysvelte--settingsgroupssvelte) : Confidentialité, relations et modération.

## 7. Administration (`admin/`)
- [`AdminUsersTab.svelte`](/wikidev/components/admin/#2-adminuserstabsvelte) : Gestion des comptes et attribution des rôles.
- [`AdminPostsTab.svelte`](/wikidev/components/admin/#3-adminpoststabsvelte--adminstoriestabsvelte) & [`AdminStoriesTab.svelte`](/wikidev/components/admin/#3-adminpoststabsvelte--adminstoriestabsvelte) : Surveillance et purge des contenus avec suppression de fichiers.
- [`AdminStorageTab.svelte`](/wikidev/components/admin/#4-adminstoragetabsvelte) : Diagnostic d'espace disque et nettoyage des orphelins.
- [`AdminAppearance.svelte`](/wikidev/components/admin/#5-adminappearancesvelte) : Activation globale des packs d'émojis et d'icônes officiels.

