import ScreenHeader from './ScreenHeader';

// Kept so existing settings screens keep their import; it is now the shared ScreenHeader.
const MenuHeader = ({ title }: { title: string; navigation?: any }) => <ScreenHeader title={title} />;

export default MenuHeader;
