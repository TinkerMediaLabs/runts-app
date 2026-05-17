

const User = {
    id: '1',
    type: 'String',
    name: '',
    profilePicUri: '',
    publisher: 'Publisher', //boolean?
    pinned: [Story],
    finished: [Story],
    inProgress: [Story],
}


const Story = {
        id: 1,
        type: 'String',
        title: '', //determine was typecase this should be in
        audioUri: '',
        summary: '',
        description: '',
        credit: '', //narrator, author, etc
        imageUri: '',
        author: 'Author',
        duration: 'Num', //use seconds
        numListens: 'Num',
        primaryTag: Tag, //this is the primary genre
        secondaryTag: Tag, //secondary genre, optional
        tags: [Tag],
        publisher: Publisher, 
        nsfw: 'Boolean',
        published: 'Boolean', //is the story is published live or not
        transcript: ''
}

const Tag = {
    id: '1',
    name: '',
    isPrimary: true, //boolean to determine if this is the primary genre or not
    stories: [Story],
    color: '', //color
    icon: '', //icon name from fontawesome,
    imageUri: '',
    tileImageUri: '',
}

const PinnedStory = {
    id: '1',
    type: 'String',
    user: User,
    story: Story, 
}

const InProgressStory = {
    id: '1',
    type: 'String',
    user: User,
    story: Story,
    playbaclPosition: 'Int',
}

const FinishedStory = {
    id: '1',
    type: 'String',
    user: User,
    story: Story,
}

const HorizontalList = {
    id: '1',
    title: '',
    stories: [Story],
}

const Author = {
    id: '1',
    name: '',
    profilePicUri: '',
    stories: [Story],
    publisher: Publisher,
}

const Publisher = {
    id: '1',
    name: '',
    authors: [Author],
    stories: [Story],
    bio: '',
    profilePicUri: '',
    website: '',
    numPublished: 'Num',

}

