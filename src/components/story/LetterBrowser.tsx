import React, { useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TouchableWithoutFeedback,
    TouchableOpacity,
    ScrollView,
    Modal,
    Dimensions,
    Animated,
    StyleSheet,
} from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LengthFilter = 'Any Length' | '< 10 min' | '10 - 30 min' | '30 - 60 min' | '60+ min';

export type LetterBrowserProps = {
    selectedLetter:       string;
    selectedIndex:        number;
    onLetterSelect:       (letter: string, index: number) => void;
    lengthFilter:         LengthFilter;
    onLengthFilterChange: (label: LengthFilter, start: number, end: number) => void;
    lengthModalVisible:   boolean;
    onLengthModalOpen:    () => void;
    onLengthModalClose:   () => void;
    compact?:             boolean;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('').map((letter, i) => ({
    index: i,
    letter,
}));

export const LENGTH_OPTIONS: { label: LengthFilter; start: number; end: number }[] = [
    { label: 'Any Length',  start: 0,       end: 5400000 },
    { label: '< 10 min',    start: 0,       end: 600000  },
    { label: '10 - 30 min', start: 600000,  end: 1800000 },
    { label: '30 - 60 min', start: 1800000, end: 3600000 },
    { label: '60+ min',     start: 3600000, end: 5400000 },
];

const CELL_WIDTH      = 44;
const ROW_HEIGHT      = 56;
const SELECTED_SIZE   = 24;
const UNSELECTED_SIZE = 14;
const { width } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// LetterItem — completely unchanged from original
// ---------------------------------------------------------------------------

type LetterItemProps = {
    letter:        string;
    index:         number;
    selectedIndex: number;
    onPress:       () => void;
};

const LetterItem = React.memo(({ letter, index, selectedIndex, onPress }: LetterItemProps) => {
    const anim = useRef(new Animated.Value(index === 0 ? 1 : 0)).current;

    useEffect(() => {
        const distance = Math.abs(index - selectedIndex);
        const target   = distance === 0 ? 1 : distance === 1 ? 0.5 : 0;
        Animated.spring(anim, {
            toValue:         target,
            damping:         16,
            stiffness:       200,
            useNativeDriver: false,
        }).start();
    }, [selectedIndex]);

    const fontSize = anim.interpolate({
        inputRange:  [0, 1],
        outputRange: [UNSELECTED_SIZE, SELECTED_SIZE],
    });

    const color = anim.interpolate({
        inputRange:  [0, 1],
        outputRange: ['rgba(255,255,255,0.3)', 'cyan'],
    });

    return (
        <TouchableWithoutFeedback onPress={onPress}>
            <View style={styles.letterCell}>
                <Animated.Text style={{
                    fontSize,
                    color,
                    fontWeight:    index === selectedIndex ? '700' : '400',
                    textTransform: 'uppercase',
                }}>
                    {letter}
                </Animated.Text>
                <View style={[styles.dot, { opacity: index === selectedIndex ? 1 : 0 }]} />
            </View>
        </TouchableWithoutFeedback>
    );
});

// ---------------------------------------------------------------------------
// LetterBrowser
// ---------------------------------------------------------------------------

const LetterBrowser = ({
    selectedLetter,
    selectedIndex,
    onLetterSelect,
    lengthFilter,
    onLengthFilterChange,
    lengthModalVisible,
    onLengthModalOpen,
    onLengthModalClose,
    compact = false,
}: LetterBrowserProps) => {

    const scrollRef = useRef<ScrollView>(null);

    const handleLetterPress = useCallback((letter: string, index: number) => {
        onLetterSelect(letter, index);
        const cellCentre = 20 + index * CELL_WIDTH + CELL_WIDTH / 2;
        const targetX    = cellCentre - width / 2;
        scrollRef.current?.scrollTo({ x: Math.max(0, targetX), animated: true });
    }, [onLetterSelect]);

    return (
        <View>

            {/* ── Length modal ── */}
            <Modal
                animationType="fade"
                transparent
                visible={lengthModalVisible}
                onRequestClose={onLengthModalClose}
            >
                <TouchableWithoutFeedback onPress={onLengthModalClose}>
                    <View style={styles.modalBackdrop}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalCard}>
                                <Text style={styles.modalTitle}>Story Length</Text>
                                {LENGTH_OPTIONS.map(({ label, start, end }) => {
                                    const active = lengthFilter === label;
                                    return (
                                        <TouchableOpacity
                                            key={label}
                                            activeOpacity={0.7}
                                            onPress={() => onLengthFilterChange(label, start, end)}
                                            style={[styles.modalOption, active && styles.modalOptionActive]}
                                        >
                                            <Text style={[styles.modalOptionText, active && styles.modalOptionTextActive]}>
                                                {label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* ── Alphabet row — conditionally rendered, LayoutAnimation handles transition ── */}
            {!compact && (
                <View style={{ height: ROW_HEIGHT }}>
                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ height: ROW_HEIGHT }}
                        contentContainerStyle={styles.alphabetContent}
                    >
                        {ALPHABET.map(({ index, letter }) => (
                            <LetterItem
                                key={letter}
                                letter={letter}
                                index={index}
                                selectedIndex={selectedIndex}
                                onPress={() => handleLetterPress(letter, index)}
                            />
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* ── Filter chips — margins tighten in compact mode ── */}
            <View style={{
                marginTop:    compact ? 6  : 20,
                marginBottom: compact ? 4  : 10,
            }}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsContent}
                >
                    <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={onLengthModalOpen}
                        style={[styles.chip, lengthFilter !== 'Any Length' && styles.chipActive]}
                    >
                        <Text style={[styles.chipText, lengthFilter !== 'Any Length' && styles.chipTextActive]}>
                            {lengthFilter}
                        </Text>
                        {lengthFilter !== 'Any Length' && (
                            <TouchableOpacity
                                onPress={() => onLengthFilterChange('Any Length', 0, 5400000)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Text style={styles.chipX}>  ×</Text>
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity activeOpacity={0.75} style={styles.chip}>
                        <Text style={styles.chipText}>Any Popularity</Text>
                    </TouchableOpacity>

                    <TouchableOpacity activeOpacity={0.75} style={styles.chip}>
                        <Text style={styles.chipText}>Any Date</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

        </View>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({

    alphabetContent: {
        paddingHorizontal: 20,
        paddingRight:      40,
    },
    letterCell: {
        width:          CELL_WIDTH,
        height:         ROW_HEIGHT,
        justifyContent: 'flex-end',
        alignItems:     'center',
        paddingBottom:  6,
    },
    dot: {
        width:           4,
        height:          4,
        borderRadius:    2,
        backgroundColor: 'cyan',
        marginTop:       4,
    },

    chipsContent: {
        paddingHorizontal: 20,
        paddingRight:      40,
        alignItems:        'center',
    },
    chip: {
        flexDirection:     'row',
        alignItems:        'center',
        paddingVertical:   5,
        paddingHorizontal: 12,
        marginHorizontal:  4,
        borderRadius:      20,
        backgroundColor:   '#2a2a2a',
        borderWidth:       1,
        borderColor:       '#444',
    },
    chipActive: {
        backgroundColor: 'rgba(0,255,255,0.12)',
        borderColor:     'cyan',
    },
    chipText: {
        color:    '#aaa',
        fontSize: 13,
    },
    chipTextActive: {
        color: 'cyan',
    },
    chipX: {
        color:    'cyan',
        fontSize: 15,
    },

    modalBackdrop: {
        flex:            1,
        justifyContent:  'center',
        alignItems:      'center',
        backgroundColor: 'rgba(0,0,0,0.75)',
    },
    modalCard: {
        borderRadius:      20,
        backgroundColor:   '#111',
        paddingVertical:   28,
        paddingHorizontal: 20,
        width:             width * 0.8,
        alignItems:        'center',
        borderWidth:       1,
        borderColor:       '#2a2a2a',
    },
    modalTitle: {
        fontWeight:    '700',
        fontSize:      18,
        color:         '#fff',
        marginBottom:  20,
        letterSpacing: 0.5,
    },
    modalOption: {
        marginVertical:  5,
        alignItems:      'center',
        borderRadius:    12,
        backgroundColor: '#1e1e1e',
        width:           width * 0.65,
        paddingVertical: 13,
        borderWidth:     1,
        borderColor:     '#333',
    },
    modalOptionActive: {
        backgroundColor: 'rgba(0,255,255,0.12)',
        borderColor:     'cyan',
    },
    modalOptionText: {
        fontWeight: '500',
        fontSize:   16,
        color:      '#ccc',
    },
    modalOptionTextActive: {
        color:      'cyan',
        fontWeight: '700',
    },
});

export default LetterBrowser;