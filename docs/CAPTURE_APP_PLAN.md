# Capture App Plan

## Purpose

Create a general-purpose capture app for use while out and about.

The app should not be limited to LGSG, but it should be designed so selected entries can later feed into the Luxe Greek Survival Guide, initially for:

- Gastronomy
- Shopping

## Product Shape

The app is a private capture and curation tool first.

It should be fast on mobile, with minimal friction:

- Open app
- Add title or quick note
- Choose type/category if useful
- Add optional photo/link/location/task
- Save

Organisation and publishing can happen later.

## Capture Item Fields

Recommended first model:

```text
id
title
body
capture_type
category_id
status
location_name
address
city
is_lgsg_candidate
lgsg_target_section
client_visible
published_at
created_at
updated_at
```

Suggested `capture_type` values:

```text
idea
note
recipe
place
restaurant
cafe
shop
product
observation
task
link
```

Suggested `lgsg_target_section` values:

```text
none
gastronomy
shopping
```

## Related Models

```text
categories
tags
capture_tag
tasks
attachments
recipes
publish_targets
```

## Tasks

Tasks should be attached to captures rather than being a totally separate to-do app.

Example task types:

```text
verify details
take photo
get address
check opening hours
write description
translate
review for LGSG
publish
```

## Recipe Data

Recipes should be editable and structured.

Recommended recipe fields:

```text
capture_id
name
greek_name
short_description
servings
prep_time
cook_time
ingredients
method
tips
image_path
source
```

Recipes can be generated as drafts, but should always remain editable.

## LGSG Integration Principle

Do not assume every capture belongs in LGSG.

Instead, selected captures can be marked as:

```text
is_lgsg_candidate = true
lgsg_target_section = gastronomy | shopping
client_visible = true | false
status = approved | published
```

Later, LGSG can import or read only approved/published items for the relevant section.

## Open Questions

1. Should the first version require login immediately?
2. Should photo upload be included in the first version or stubbed first?
3. Should the first version use SQLite locally, then migrate to MySQL/PostgreSQL later?
4. Should the app eventually push data into LGSG, or should LGSG pull from this app?
5. Should Google Sheet data be imported once, synced repeatedly, or treated only as reference?
