export type RootStackParamList = {
    Root: undefined;
    SignUp: undefined;
    SignIn: undefined;
    Welcome: undefined;
    EmailSignIn: undefined;
    ForgotPassword: undefined;
    ConfirmEmail: undefined;
    ForgotPasswordCon: undefined;
    StoryScreen: { storyID: string };
    UserScreen: undefined;
    AboutScreen: undefined;
    AccountScreen: undefined;
    TagHomeScreen: { id: string; name: string };
    BrowseByTitle: undefined;
    AuthorDetails: undefined;
    InProgressScreen: undefined;
    HistoryScreen: undefined;
    AuthorFollowing: undefined;
    AppSettingsScreen: undefined;
    SearchScreen: undefined;
    Waiting: undefined;
    WelcomePref: undefined;
  };
  
  export type BottomTabParamList = {
    Discover: undefined;
    Browse: undefined;
    Playlist: undefined;
    Premium: undefined;
  };
  
  export type TabOneParamList = {
    HomeScreen: undefined;
  };
  
  export type TabTwoParamList = {
    DiscoverScreen: undefined;
  }
  
  export type TabThreeParamList = {
    PlaylistScreen: undefined;
  };
  
  export type TabFourParamList = {
    PremiumScreen: undefined;
  };
  
  export type User = {
    id: String;
    name: String;
    imageUri: String;
    bio: String;
    email: String;
  }
  
  declare const awsmobile: {};
  export default awsmobile;