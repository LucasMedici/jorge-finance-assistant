import { StyleSheet } from 'react-native';
import { themas } from '../../global/themes';
import { fonts } from '../../global/fonts';

export const style = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themas.colors.primary,
    paddingTop: 10,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },

  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: '#FFFFFF',
  },

  headerSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },

  datePickerContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 12,
    justifyContent: 'space-between',
  },

  datePickerButton: {
    flex: 1,
    backgroundColor: 'rgba(141, 198, 62, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(141, 198, 62, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  datePickerText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 15,
    gap: 10,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(141, 198, 62, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: themas.colors.secondary,
  },

  summaryLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 5,
  },

  summaryAmount: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: themas.colors.secondary,
  },

  chartContainer: {
    marginHorizontal: 15,
    marginVertical: 15,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  chartScrollView: {
    overflow: 'hidden',
    borderRadius: 8,
  },

  chartScrollContainer: {
    overflow: 'hidden',
    borderRadius: 8,
    marginHorizontal: -12,
    marginVertical: -12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  chartTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 10,
  },

  lastEntriesContainer: {
    marginHorizontal: 15,
    marginVertical: 15,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  lastEntriesTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 12,
  },

  lastEntryItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: themas.colors.secondary,
  },

  lastEntryText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#FFFFFF',
  },

  legendContainer: {
    marginHorizontal: 15,
    marginVertical: 10,
    gap: 8,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
  },

  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: themas.colors.secondary,
  },

  legendText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#FFFFFF',
    flex: 1,
  },

  // Antigos que ainda podem estar em uso
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },

  categoryLegend: {
    marginTop: 10,
    gap: 8,
  },

  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  legendTextContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  legendCategory: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#FFFFFF',
  },

  legendAmount: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: themas.colors.secondary,
  },

  monthLegend: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  monthItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },

  monthName: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },

  monthAmount: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: themas.colors.secondary,
  },

  totalContainer: {
    marginHorizontal: 15,
    marginVertical: 15,
    backgroundColor: 'rgba(141, 198, 62, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(141, 198, 62, 0.3)',
    alignItems: 'center',
  },

  totalLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },

  totalAmount: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: themas.colors.secondary,
  },
});
