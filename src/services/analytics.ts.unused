import rudderClient from '@rudderstack/rudder-sdk-react-native';

rudderClient.setup(
  process.env.EXPO_PUBLIC_RUDDER_WRITE_KEY!,
  {
    dataPlaneUrl:
      process.env.EXPO_PUBLIC_RUDDER_DATA_PLANE
  }
);

export const Analytics = {
 track(event:string,properties={}){
   rudderClient.track(event,properties);
 },

//  identify(userId:string,traits={}){
//    rudderClient.identify(userId,traits);
//  },

 screen(name:string){
   rudderClient.screen(name);
 }
};