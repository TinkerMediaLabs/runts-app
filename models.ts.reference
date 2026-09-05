

type User = {
    id: ID!
    type: String
    name: String
    profilePicUri: String
    birthdate: Date
    publisher: Boolean
    //pinned: [Story]
    //finished: [Story]
    //inProgress: [Story]
}

type Story = {
    id: ID
    type: String
    title: String
    audioUri: String
    summary: String //short teaser of the story
    description: String //full description of the story
    credit: String //additional credit for narrator, author, etc
    imageUri: String
    author: Author
    duration: Int
    numListens: Int
    primaryTag: Tag //primary genre
    secondaryTag: Tag//secondary genre, optional
    tags: [Tag],
    publisher: Publisher
    nsfw: Boolean
    live: Boolean //is the story is published live or not
    transcript: String
}

type Author = {
    id: ID
    name: String
    profilePicUri: String
    stories: [Story]
    publisher: Publisher
}

type Tag = {
    id: ID
    name: String
    isPrimary: Boolean //boolean to determine if this is the major genre or not. Major genres will show on the discover screen
    stories: [Story]
    color: String //color
    icon: String //icon name from fontawesome,
    imageUri: String
    tileImageUri: String
}

type Publisher = {
    id: ID //publishers are mostly internal. A publisher may have multiple authors/pen names
    name: String
    authors: [Author]
    stories: [Story]
    bio: String
    profilePicUri: String
    website: String
    numPublished: Int
}

type PinnedStory = {
    id: '1',
    type: 'String',
    user: User,
    story: Story, 
}

type InProgressStory = {
    id: '1',
    type: 'String',
    user: User,
    story: Story,
    playbaclPosition: 'Int',
}

type FinishedStory = {
    id: '1',
    type: 'String',
    user: User,
    story: Story,
}

type HorizontalList = {
    id: '1',
    title: '',
    stories: [Story],
}


