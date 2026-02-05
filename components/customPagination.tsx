// components/customPagination.tsx
import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
} from "react-native";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const [showPageInput, setShowPageInput] = useState(false);
  const [pageInputValue, setPageInputValue] = useState("");
  const dimensions = useWindowDimensions();
  const isMobile = dimensions.width <= 1000;

  const handlePageInput = () => {
    const page = parseInt(pageInputValue);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
      setShowPageInput(false);
      setPageInputValue("");
    }
  };

  const renderPageNumbers = () => {
    const pages = [];

    if (totalPages <= 5) {
      // Show all pages if 5 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <TouchableOpacity
            key={i}
            onPress={() => onPageChange(i)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: i === currentPage ? "#2C2C2C" : "transparent",
              borderRadius: 4,
              marginHorizontal: 2,
            }}
          >
            <Text style={{ color: "white", fontSize: isMobile ? 10 : 14 }}>
              {i}
            </Text>
          </TouchableOpacity>,
        );
      }
    } else {
      // First 3 pages: [1] [2] [3] [...] [10]
      if (currentPage <= 3) {
        for (let i = 1; i <= 3; i++) {
          pages.push(
            <TouchableOpacity
              key={i}
              onPress={() => onPageChange(i)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: i === currentPage ? "#2C2C2C" : "transparent",
                borderRadius: 4,
                marginHorizontal: 2,
              }}
            >
              <Text style={{ color: "white", fontSize: isMobile ? 10 : 14 }}>
                {i}
              </Text>
            </TouchableOpacity>,
          );
        }

        pages.push(
          <TouchableOpacity
            key="ellipsis"
            onPress={() => setShowPageInput(!showPageInput)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: "transparent",
              borderRadius: 4,
              marginHorizontal: 2,
            }}
          >
            <Text style={{ color: "white", fontSize: isMobile ? 10 : 14 }}>
              ...
            </Text>
          </TouchableOpacity>,
        );

        pages.push(
          <TouchableOpacity
            key={totalPages}
            onPress={() => onPageChange(totalPages)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor:
                totalPages === currentPage ? "#2C2C2C" : "transparent",
              borderRadius: 4,
              marginHorizontal: 2,
            }}
          >
            <Text style={{ color: "white", fontSize: isMobile ? 10 : 14 }}>
              {totalPages}
            </Text>
          </TouchableOpacity>,
        );
      }
      // Last 3 pages: [1] [...] [8] [9] [10]
      else if (currentPage >= totalPages - 2) {
        pages.push(
          <TouchableOpacity
            key={1}
            onPress={() => onPageChange(1)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: 1 === currentPage ? "#2C2C2C" : "transparent",
              borderRadius: 4,
              marginHorizontal: 2,
            }}
          >
            <Text style={{ color: "white", fontSize: isMobile ? 10 : 14 }}>
              1
            </Text>
          </TouchableOpacity>,
        );

        pages.push(
          <TouchableOpacity
            key="ellipsis"
            onPress={() => setShowPageInput(!showPageInput)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: "transparent",
              borderRadius: 4,
              marginHorizontal: 2,
            }}
          >
            <Text style={{ color: "white", fontSize: isMobile ? 10 : 14 }}>
              ...
            </Text>
          </TouchableOpacity>,
        );

        for (let i = totalPages - 2; i <= totalPages; i++) {
          pages.push(
            <TouchableOpacity
              key={i}
              onPress={() => onPageChange(i)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: i === currentPage ? "#2C2C2C" : "transparent",
                borderRadius: 4,
                marginHorizontal: 2,
              }}
            >
              <Text style={{ color: "white", fontSize: isMobile ? 10 : 14 }}>
                {i}
              </Text>
            </TouchableOpacity>,
          );
        }
      }
      // Middle pages: [1] [...] [4] [5] [6] [...] [10]
      else {
        pages.push(
          <TouchableOpacity
            key={1}
            onPress={() => onPageChange(1)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: 1 === currentPage ? "#2C2C2C" : "transparent",
              borderRadius: 4,
              marginHorizontal: 2,
            }}
          >
            <Text style={{ color: "white", fontSize: isMobile ? 10 : 14 }}>
              1
            </Text>
          </TouchableOpacity>,
        );

        pages.push(
          <TouchableOpacity
            key="ellipsis-start"
            onPress={() => setShowPageInput(!showPageInput)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: "transparent",
              borderRadius: 4,
              marginHorizontal: 2,
            }}
          >
            <Text style={{ color: "white", fontSize: isMobile ? 10 : 14 }}>
              ...
            </Text>
          </TouchableOpacity>,
        );

        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(
            <TouchableOpacity
              key={i}
              onPress={() => onPageChange(i)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: i === currentPage ? "#2C2C2C" : "transparent",
                borderRadius: 4,
                marginHorizontal: 2,
              }}
            >
              <Text style={{ color: "white", fontSize: isMobile ? 10 : 14 }}>
                {i}
              </Text>
            </TouchableOpacity>,
          );
        }

        pages.push(
          <TouchableOpacity
            key="ellipsis-end"
            onPress={() => setShowPageInput(!showPageInput)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: "transparent",
              borderRadius: 4,
              marginHorizontal: 2,
            }}
          >
            <Text style={{ color: "white", fontSize: isMobile ? 10 : 14 }}>
              ...
            </Text>
          </TouchableOpacity>,
        );

        pages.push(
          <TouchableOpacity
            key={totalPages}
            onPress={() => onPageChange(totalPages)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor:
                totalPages === currentPage ? "#2C2C2C" : "transparent",
              borderRadius: 4,
              marginHorizontal: 2,
            }}
          >
            <Text style={{ color: "white", fontSize: isMobile ? 10 : 14 }}>
              {totalPages}
            </Text>
          </TouchableOpacity>,
        );
      }
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <View
      style={{
        padding: 12,
        borderRadius: 6,
      }}
    >
      <HStack
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <HStack style={{ alignItems: "center", gap: 8 }}>
          {/* Previous Button */}
          <TouchableOpacity
            onPress={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 10,
              paddingVertical: 6,
              opacity: currentPage === 1 ? 0.5 : 1,
            }}
          >
            <ChevronLeft size={16} color="white" />
            <Text
              style={{
                color: "white",
                fontSize: isMobile ? 10 : 14,
                marginLeft: 4,
              }}
            >
              Previous
            </Text>
          </TouchableOpacity>

          {/* Page Numbers */}
          <HStack style={{ alignItems: "center" }}>
            {renderPageNumbers()}
          </HStack>

          {/* Page Input Modal */}
          {showPageInput && (
            <View
              style={{
                position: "absolute",
                top: -60,
                backgroundColor: "#262626",
                padding: 12,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: "#404040",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
                zIndex: 1000,
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: isMobile ? 10 : 14,
                  marginBottom: 8,
                }}
              >
                Go to page:
              </Text>
              <HStack style={{ gap: 8, alignItems: "center" }}>
                <TextInput
                  value={pageInputValue}
                  onChangeText={setPageInputValue}
                  keyboardType="number-pad"
                  placeholder="Page"
                  placeholderTextColor="#6b7280"
                  style={{
                    backgroundColor: "#171717",
                    color: "white",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 4,
                    width: 60,
                    fontSize: isMobile ? 10 : 14,
                  }}
                  onSubmitEditing={handlePageInput}
                />
                <TouchableOpacity
                  onPress={handlePageInput}
                  style={{
                    backgroundColor: "#2C2C2C",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 4,
                  }}
                >
                  <Text
                    style={{ color: "white", fontSize: isMobile ? 10 : 14 }}
                  >
                    Go
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowPageInput(false);
                    setPageInputValue("");
                  }}
                  style={{
                    backgroundColor: "#404040",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 4,
                  }}
                >
                  <Text
                    style={{ color: "white", fontSize: isMobile ? 10 : 14 }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </HStack>
            </View>
          )}

          {/* Next Button */}
          <TouchableOpacity
            onPress={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 10,
              paddingVertical: 6,
              opacity: currentPage === totalPages ? 0.5 : 1,
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: isMobile ? 10 : 14,
                marginRight: 4,
              }}
            >
              Next
            </Text>
            <ChevronRight size={16} color="white" />
          </TouchableOpacity>
        </HStack>
      </HStack>
    </View>
  );
}
