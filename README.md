# Capture App

Mobile-first personal capture app for ideas, recipes, places, shopping finds, observations, and follow-up tasks.

This project is intended to start as a standalone Laravel app, while keeping a clean path to future integration with the Luxe Greek Survival Guide (LGSG), especially the Gastronomy and Shopping sections.

## Current Decision

- Build as a standalone project first.
- Use Laravel so the future integration path matches LGSG.
- Keep most captures private/general by default.
- Allow selected captures to be marked as candidates for LGSG.
- Start with Gastronomy and Shopping as the only LGSG target sections.

## First Version Goal

The first useful version should let the owner:

1. Capture something quickly while out.
2. Categorise it.
3. Add notes, photos, links, and follow-up tasks.
4. Search and filter captured items later.
5. Mark selected items as potential LGSG content.
6. Choose whether an item is intended for Gastronomy, Shopping, or neither.

## Core Concept

Most entries are ordinary personal captures.

Some entries can optionally become LGSG candidates:

- Recipe -> possible Gastronomy item
- Restaurant/cafe/market -> possible Gastronomy item
- Shop/product/artisan -> possible Shopping item
- General idea/note/observation -> no LGSG target unless explicitly selected

## Initial Statuses

- captured
- reviewing
- approved
- published
- archived

## Not Yet Done

- Laravel project scaffold
- Database migrations
- Login/auth setup
- Local dev server
- GitHub connection
- LGSG import/export integration

These should happen after the project structure and data model are agreed.
