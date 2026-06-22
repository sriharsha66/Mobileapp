export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  OTP: { phone: string; name: string; email: string; password: string };
};

export type MainStackParamList = {
  Tabs: undefined;
  Upload: { reportId?: string };
  ReportDetail: { reportId: string };
  EditReport: { reportId: string };
  FileViewer: { fileUri: string; fileType: string; fileName: string };
  SavedQuotes: undefined;
  StarredReports: undefined;
};

export type TabParamList = {
  HomeTab: undefined;
  MyReportsTab: undefined;
  AddTab: undefined;
  ProfileTab: undefined;
};
